import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { io, Socket } from 'socket.io-client';
import * as os from 'os';
import {
  MessageType,
  NodeRegisterDto,
  NodeHeartbeatDto,
  NodeMetricsDto,
  CommandAckDto,
  CommandResultDto,
  ConnectionAckDto,
  RegisterAckDto,
  DeploymentCreateDto,
  DeploymentStopDto,
  ModelDownloadDto,
  SystemHealthCheckDto,
  NodeStatus,
  CommandStatus,
} from '@hydrabyte/shared';
import { v4 as uuidv4 } from 'uuid';
import { HardwareService } from '../hardware/hardware.service';

/**
 * WebSocket client service for worker node
 * Connects to AIWM controller and handles bidirectional communication
 */
@Injectable()
export class WebSocketClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebSocketClientService.name);
  private socket: Socket | null = null;
  private isConnected = false;
  private isRegistered = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  private nodeId: string;
  private nodeName: string;
  private controllerUrl: string;
  private token: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly hardwareService: HardwareService
  ) {
    this.controllerUrl = this.configService.get<string>('CONTROLLER_WS_URL') || '';
    this.token = this.configService.get<string>('NODE_TOKEN') || '';
    this.nodeId = this.configService.get<string>('NODE_ID') || '';
    this.nodeName = this.configService.get<string>('NODE_NAME') || 'worker-node';
  }

  async onModuleInit() {
    if (!this.token || !this.nodeId) {
      this.logger.error('NODE_TOKEN and NODE_ID must be set in environment variables');
      process.exit(1);
    }

    this.logger.log('Initializing WebSocket client...');
    await this.connect();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down WebSocket client...');
    this.stopHeartbeat();
    this.stopMetrics();

    if (this.socket) {
      this.socket.disconnect();
    }
  }

  /**
   * Connect to controller
   */
  async connect(): Promise<void> {
    this.logger.log(`Connecting to controller: ${this.controllerUrl}`);

    this.socket = io(this.controllerUrl, {
      auth: {
        token: this.token,
      },
      reconnection: true,
      reconnectionDelay: 5000,
      reconnectionDelayMax: 60000,
      reconnectionAttempts: Infinity,
      transports: ['websocket', 'polling'],
    });

    // Connection events
    this.socket.on('connect', () => {
      this.logger.log(`Connected to controller (socket: ${this.socket?.id})`);
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      this.logger.warn(`Disconnected from controller: ${reason}`);
      this.isConnected = false;
      this.isRegistered = false;
      this.stopHeartbeat();
      this.stopMetrics();
    });

    this.socket.on('connect_error', (error) => {
      this.logger.error(`Connection error: ${error.message}`);
    });

    // Message handlers
    this.socket.on(MessageType.CONNECTION_ACK, (data: ConnectionAckDto) => {
      this.handleConnectionAck(data);
    });

    this.socket.on(MessageType.REGISTER_ACK, (data: RegisterAckDto) => {
      this.handleRegisterAck(data);
    });

    // Command handlers
    this.socket.on(MessageType.DEPLOYMENT_CREATE, (data: DeploymentCreateDto) => {
      this.handleDeploymentCreate(data);
    });

    this.socket.on(MessageType.DEPLOYMENT_STOP, (data: DeploymentStopDto) => {
      this.handleDeploymentStop(data);
    });

    this.socket.on(MessageType.MODEL_DOWNLOAD, (data: ModelDownloadDto) => {
      this.handleModelDownload(data);
    });

    this.socket.on(MessageType.SYSTEM_HEALTH_CHECK, (data: SystemHealthCheckDto) => {
      this.handleSystemHealthCheck(data);
    });
  }

  /**
   * Handle connection acknowledgment
   */
  private async handleConnectionAck(data: ConnectionAckDto): Promise<void> {
    if (data.status === 'success') {
      this.logger.log('Connection acknowledged by controller');
      await this.registerNode();
    } else {
      this.logger.error(`Connection rejected: ${data.error?.message}`);
      process.exit(1);
    }
  }

  /**
   * Register node with controller
   */
  private async registerNode(): Promise<void> {
    this.logger.log('Registering node with controller...');

    const osInfo = await this.hardwareService.getOsInfo();
    const cpuInfo = this.hardwareService.getCpuInfo();
    const ramInfo = this.hardwareService.getRamInfo();
    const diskInfo = await this.hardwareService.getDiskInfo();
    const gpuDevices = await this.hardwareService.detectGpuDevices();
    const containerRuntime = await this.hardwareService.getContainerRuntime();
    const publicIp = await this.hardwareService.getPublicIpAddress();
    const privateIp = this.hardwareService.getPrivateIpAddress();

    const registerData: NodeRegisterDto = {
      type: MessageType.NODE_REGISTER,
      messageId: uuidv4(),
      timestamp: new Date().toISOString(),
      data: {
        nodeId: this.nodeId,
        name: this.nodeName,
        hostname: os.hostname(),
        ipAddress: privateIp,
        publicIpAddress: publicIp,
        os: osInfo,
        cpuCores: cpuInfo.cores,
        cpuModel: cpuInfo.model,
        ramTotal: ramInfo.total,
        diskTotal: diskInfo.total,
        gpuDevices,
        daemonVersion: '1.0.0', // TODO: Get from package.json
        nodeStatus: NodeStatus.READY,
        uptimeSeconds: this.hardwareService.getUptimeSeconds(),
        containerRuntime,
      },
    };

    this.socket?.emit(MessageType.NODE_REGISTER, registerData);
  }

  /**
   * Handle registration acknowledgment
   */
  private handleRegisterAck(data: RegisterAckDto): void {
    if (data.data.status === 'success') {
      this.logger.log('Node registered successfully');
      this.isRegistered = true;

      // Start heartbeat and metrics
      const heartbeatInterval = data.data.controllerInfo.heartbeatInterval || 30000;
      const metricsInterval = data.data.controllerInfo.metricsInterval || 60000;

      this.startHeartbeat(heartbeatInterval);
      this.startMetrics(metricsInterval);
    } else {
      this.logger.error('Node registration failed');
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(interval: number): void {
    this.logger.log(`Starting heartbeat (interval: ${interval}ms)`);

    this.heartbeatInterval = setInterval(async () => {
      if (!this.isConnected || !this.isRegistered) return;

      const ramInfo = this.hardwareService.getRamInfo();
      const cpuUsage = this.hardwareService.getCpuUsage();
      const gpuDevices = await this.hardwareService.getGpuMetrics();

      const heartbeat: NodeHeartbeatDto = {
        type: MessageType.TELEMETRY_HEARTBEAT,
        messageId: uuidv4(),
        timestamp: new Date().toISOString(),
        data: {
          nodeId: this.nodeId,
          status: NodeStatus.HEALTHY,
          uptimeSeconds: this.hardwareService.getUptimeSeconds(),
          activeDeployments: 0, // TODO: Track deployments
          cpuUsage,
          ramUsage: ramInfo.usage,
          gpuStatus: gpuDevices.map(gpu => ({
            deviceId: gpu.deviceId,
            utilization: gpu.utilization || 0,
            status: gpu.status || 'idle',
          })),
        },
      };

      this.socket?.emit(MessageType.TELEMETRY_HEARTBEAT, heartbeat);
    }, interval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      this.logger.log('Heartbeat stopped');
    }
  }

  /**
   * Start metrics collection
   */
  private startMetrics(interval: number): void {
    this.logger.log(`Starting metrics collection (interval: ${interval}ms)`);

    this.metricsInterval = setInterval(async () => {
      if (!this.isConnected || !this.isRegistered) return;

      const cpuInfo = this.hardwareService.getCpuInfo();
      const ramInfo = this.hardwareService.getRamInfo();
      const diskInfo = await this.hardwareService.getDiskInfo();
      const gpuDevices = await this.hardwareService.getGpuMetrics();

      const metrics: NodeMetricsDto = {
        type: MessageType.TELEMETRY_METRICS,
        messageId: uuidv4(),
        timestamp: new Date().toISOString(),
        data: {
          nodeId: this.nodeId,
          cpu: {
            usage: this.hardwareService.getCpuUsage(),
            cores: cpuInfo.cores,
            loadAverage: os.loadavg() as [number, number, number],
          },
          memory: {
            total: ramInfo.total,
            used: ramInfo.used,
            free: ramInfo.free,
            cached: 0, // TODO: Get cached memory
            usage: ramInfo.usage,
          },
          disk: {
            total: diskInfo.total,
            used: diskInfo.used,
            free: diskInfo.free,
            usage: diskInfo.usage,
          },
          network: {
            bytesReceived: 0, // TODO: Get network stats
            bytesSent: 0,
            packetsReceived: 0,
            packetsSent: 0,
          },
          gpuDevices,
        },
      };

      this.socket?.emit(MessageType.TELEMETRY_METRICS, metrics);
    }, interval);
  }

  /**
   * Stop metrics collection
   */
  private stopMetrics(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
      this.logger.log('Metrics collection stopped');
    }
  }

  /**
   * Send command acknowledgment
   */
  private sendCommandAck(originalMessageId: string, estimatedDuration?: number): void {
    const ack: CommandAckDto = {
      type: MessageType.COMMAND_ACK,
      messageId: uuidv4(),
      timestamp: new Date().toISOString(),
      data: {
        originalMessageId,
        status: CommandStatus.ACKNOWLEDGED,
        estimatedDuration,
      },
    };

    this.socket?.emit(MessageType.COMMAND_ACK, ack);
    this.logger.log(`Command ACK sent for message ${originalMessageId}`);
  }

  /**
   * Send command result
   */
  private sendCommandResult(
    originalMessageId: string,
    resourceId: string,
    status: CommandStatus.SUCCESS | CommandStatus.ERROR,
    result?: any,
    error?: any
  ): void {
    const commandResult: CommandResultDto = {
      type: MessageType.COMMAND_RESULT,
      messageId: uuidv4(),
      timestamp: new Date().toISOString(),
      data: {
        originalMessageId,
        deploymentId: resourceId,
        status,
        result,
        error,
      },
    };

    this.socket?.emit(MessageType.COMMAND_RESULT, commandResult);
    this.logger.log(`Command result sent for message ${originalMessageId}: ${status}`);
  }

  /**
   * Handle deployment create command
   */
  private async handleDeploymentCreate(data: DeploymentCreateDto): Promise<void> {
    const resourceId = data.resource.id;
    this.logger.log(`Received deployment create command: ${resourceId}`);

    // Send ACK
    this.sendCommandAck(data.messageId, 60);

    try {
      // TODO: Implement deployment creation logic
      this.logger.log(`Creating deployment: ${resourceId}`);

      // Simulate deployment
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Send success result
      this.sendCommandResult(
        data.messageId,
        resourceId,
        CommandStatus.SUCCESS,
        {
          containerId: 'mock-container-id',
          endpoint: 'http://localhost:8000',
          startedAt: new Date().toISOString(),
        }
      );
    } catch (error: any) {
      this.logger.error(`Deployment creation failed: ${error.message}`);

      // Send error result
      this.sendCommandResult(
        data.messageId,
        resourceId,
        CommandStatus.ERROR,
        undefined,
        {
          code: 'DEPLOYMENT_FAILED',
          message: error.message,
          retryable: true,
        }
      );
    }
  }

  /**
   * Handle deployment stop command
   */
  private async handleDeploymentStop(data: DeploymentStopDto): Promise<void> {
    const resourceId = data.resource.id;
    this.logger.log(`Received deployment stop command: ${resourceId}`);

    // Send ACK
    this.sendCommandAck(data.messageId, 10);

    try {
      // TODO: Implement deployment stop logic
      this.logger.log(`Stopping deployment: ${resourceId}`);

      // Simulate stop
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Send success result
      this.sendCommandResult(
        data.messageId,
        resourceId,
        CommandStatus.SUCCESS,
        {
          stoppedAt: new Date().toISOString(),
        }
      );
    } catch (error: any) {
      this.logger.error(`Deployment stop failed: ${error.message}`);

      // Send error result
      this.sendCommandResult(
        data.messageId,
        resourceId,
        CommandStatus.ERROR,
        undefined,
        {
          code: 'STOP_FAILED',
          message: error.message,
          retryable: true,
        }
      );
    }
  }

  /**
   * Handle model download command
   */
  private async handleModelDownload(data: ModelDownloadDto): Promise<void> {
    const resourceId = data.resource.id;
    this.logger.log(`Received model download command: ${resourceId}`);

    // Send ACK
    this.sendCommandAck(data.messageId, 300);

    try {
      // TODO: Implement model download logic
      this.logger.log(`Downloading model: ${resourceId} from ${data.data.source}`);

      // Simulate download
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Send success result
      this.sendCommandResult(
        data.messageId,
        resourceId,
        CommandStatus.SUCCESS,
        {
          downloadedAt: new Date().toISOString(),
          path: data.data.targetPath,
        }
      );
    } catch (error: any) {
      this.logger.error(`Model download failed: ${error.message}`);

      // Send error result
      this.sendCommandResult(
        data.messageId,
        resourceId,
        CommandStatus.ERROR,
        undefined,
        {
          code: 'DOWNLOAD_FAILED',
          message: error.message,
          retryable: true,
        }
      );
    }
  }

  /**
   * Handle system health check command
   */
  private async handleSystemHealthCheck(data: SystemHealthCheckDto): Promise<void> {
    this.logger.log('Received system health check command');

    // Send ACK
    this.sendCommandAck(data.messageId, 2);

    try {
      const result: any = {
        nodeStatus: 'healthy',
        uptimeSeconds: this.hardwareService.getUptimeSeconds(),
        timestamp: new Date().toISOString(),
      };

      if (data.data.includeMetrics) {
        const ramInfo = this.hardwareService.getRamInfo();
        const diskInfo = await this.hardwareService.getDiskInfo();
        const gpuDevices = await this.hardwareService.getGpuMetrics();

        result.metrics = {
          cpuUsage: this.hardwareService.getCpuUsage(),
          ramUsed: ramInfo.used,
          diskUsed: diskInfo.used,
          gpuDevices,
        };
      }

      // Send success result
      this.sendCommandResult(
        data.messageId,
        this.nodeId,
        CommandStatus.SUCCESS,
        result
      );
    } catch (error: any) {
      this.logger.error(`Health check failed: ${error.message}`);

      // Send error result
      this.sendCommandResult(
        data.messageId,
        this.nodeId,
        CommandStatus.ERROR,
        undefined,
        {
          code: 'HEALTH_CHECK_FAILED',
          message: error.message,
          retryable: true,
        }
      );
    }
  }

  /**
   * Check if worker is connected
   */
  isWorkerConnected(): boolean {
    return this.isConnected && this.isRegistered;
  }
}
