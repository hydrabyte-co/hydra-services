import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationEventType,
  NotificationSeverity,
} from './notification.schema';

/**
 * NotificationGateway
 * Handles WebSocket connections for real-time notifications
 *
 * Features:
 * - JWT authentication on connection
 * - Room-based broadcasting (user, org, agent rooms)
 * - 4 event types: system.notification, service.event, service.alert, agent.event
 */
@WebSocketGateway({
  cors: {
    origin: '*', // Configure based on your CORS policy
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private connectedClients = new Map<string, Socket>();

  constructor(
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  /**
   * Handle client connection
   * Authenticates using JWT from handshake auth header
   */
  async handleConnection(client: Socket) {
    try {
      // Extract JWT token from handshake
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} attempted to connect without token`);
        client.disconnect();
        return;
      }

      // Verify JWT token (simplified - in production use JwtService)
      // For now, we'll extract user info from token without full verification
      // In real implementation, integrate with IAM service JWT verification

      const user = this.decodeToken(token);
      if (!user) {
        this.logger.warn(`Client ${client.id} provided invalid token`);
        client.disconnect();
        return;
      }

      // Store user info in socket data
      client.data.user = user;
      this.connectedClients.set(client.id, client);

      // Auto-join user-specific room
      if (user.userId) {
        await client.join(`user:${user.userId}`);
        this.logger.log(`Client ${client.id} joined room: user:${user.userId}`);
      }

      // Auto-join org room if orgId exists
      if (user.orgId) {
        await client.join(`org:${user.orgId}`);
        this.logger.log(`Client ${client.id} joined room: org:${user.orgId}`);
      }

      // Auto-join agent room if agentId exists
      if (user.agentId) {
        await client.join(`agent:${user.agentId}`);
        this.logger.log(`Client ${client.id} joined room: agent:${user.agentId}`);
      }

      this.logger.log(
        `Client connected: ${client.id} (userId: ${user.userId}, orgId: ${user.orgId})`,
      );

      // Emit connection success
      client.emit('connected', {
        message: 'Connected to notification service',
        userId: user.userId,
        rooms: Array.from(client.rooms),
      });
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    const user = client.data.user;
    this.connectedClients.delete(client.id);
    this.logger.log(
      `Client disconnected: ${client.id} (userId: ${user?.userId || 'unknown'})`,
    );
  }

  /**
   * Decode JWT token (simplified)
   * TODO: Integrate with IAM service for proper JWT verification
   */
  private decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      this.logger.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Emit system.notification event
   */
  emitSystemNotification(data: {
    title: string;
    message: string;
    severity: NotificationSeverity;
    notificationMetadata: {
      notificationId?: string;
      correlationId?: string;
      orgId?: string;
      userId?: string;
      timestamp: string;
    };
    data?: Record<string, any>;
    recipients: {
      userIds?: string[];
      orgIds?: string[];
      broadcast?: boolean;
    };
  }) {
    const event = 'system.notification';

    // Broadcast to all if specified
    if (data.recipients.broadcast) {
      this.server.emit(event, data);
      this.logger.log(`Broadcasted ${event} to all clients`);
      return;
    }

    // Send to specific users
    if (data.recipients.userIds?.length) {
      data.recipients.userIds.forEach((userId) => {
        this.server.to(`user:${userId}`).emit(event, data);
      });
      this.logger.log(`Emitted ${event} to ${data.recipients.userIds.length} users`);
    }

    // Send to specific orgs
    if (data.recipients.orgIds?.length) {
      data.recipients.orgIds.forEach((orgId) => {
        this.server.to(`org:${orgId}`).emit(event, data);
      });
      this.logger.log(`Emitted ${event} to ${data.recipients.orgIds.length} orgs`);
    }
  }

  /**
   * Emit service.event
   */
  emitServiceEvent(data: {
    name: string;
    notificationMetadata: {
      notificationId?: string;
      correlationId?: string;
      orgId?: string;
      userId?: string;
      agentId?: string;
      timestamp: string;
    };
    data?: Record<string, any>;
    recipients: {
      userIds?: string[];
      orgIds?: string[];
      agentIds?: string[];
      broadcast?: boolean;
    };
  }) {
    const event = 'service.event';

    if (data.recipients.broadcast) {
      this.server.emit(event, data);
      return;
    }

    if (data.recipients.userIds?.length) {
      data.recipients.userIds.forEach((userId) => {
        this.server.to(`user:${userId}`).emit(event, data);
      });
    }

    if (data.recipients.orgIds?.length) {
      data.recipients.orgIds.forEach((orgId) => {
        this.server.to(`org:${orgId}`).emit(event, data);
      });
    }

    if (data.recipients.agentIds?.length) {
      data.recipients.agentIds.forEach((agentId) => {
        this.server.to(`agent:${agentId}`).emit(event, data);
      });
    }

    this.logger.log(`Emitted ${event}: ${data.name}`);
  }

  /**
   * Emit service.alert
   */
  emitServiceAlert(data: {
    title: string;
    message: string;
    severity: NotificationSeverity;
    notificationMetadata: {
      notificationId?: string;
      correlationId?: string;
      orgId?: string;
      userId?: string;
      timestamp: string;
    };
    data?: Record<string, any>;
    recipients: {
      userIds?: string[];
      orgIds?: string[];
      broadcast?: boolean;
    };
  }) {
    const event = 'service.alert';

    if (data.recipients.broadcast) {
      this.server.emit(event, data);
      return;
    }

    if (data.recipients.userIds?.length) {
      data.recipients.userIds.forEach((userId) => {
        this.server.to(`user:${userId}`).emit(event, data);
      });
    }

    if (data.recipients.orgIds?.length) {
      data.recipients.orgIds.forEach((orgId) => {
        this.server.to(`org:${orgId}`).emit(event, data);
      });
    }

    this.logger.log(`Emitted ${event}: ${data.title} (${data.severity})`);
  }

  /**
   * Emit agent.event
   */
  emitAgentEvent(data: {
    name: string;
    title?: string;
    message?: string;
    severity?: NotificationSeverity;
    notificationMetadata: {
      notificationId?: string;
      correlationId?: string;
      orgId?: string;
      userId?: string;
      agentId?: string;
      timestamp: string;
    };
    data?: Record<string, any>;
    recipients: {
      userIds?: string[];
      orgIds?: string[];
      agentIds?: string[];
      broadcast?: boolean;
    };
  }) {
    const event = 'agent.event';

    if (data.recipients.broadcast) {
      this.server.emit(event, data);
      return;
    }

    if (data.recipients.userIds?.length) {
      data.recipients.userIds.forEach((userId) => {
        this.server.to(`user:${userId}`).emit(event, data);
      });
    }

    if (data.recipients.orgIds?.length) {
      data.recipients.orgIds.forEach((orgId) => {
        this.server.to(`org:${orgId}`).emit(event, data);
      });
    }

    if (data.recipients.agentIds?.length) {
      data.recipients.agentIds.forEach((agentId) => {
        this.server.to(`agent:${agentId}`).emit(event, data);
      });
    }

    this.logger.log(`Emitted ${event}: ${data.name}`);
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get clients in a specific room
   */
  async getClientsInRoom(roomName: string): Promise<string[]> {
    const room = this.server.sockets.adapter.rooms.get(roomName);
    return room ? Array.from(room) : [];
  }
}
