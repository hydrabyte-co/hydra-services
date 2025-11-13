import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import { IGpuDevice, IOsInfo, IContainerRuntime } from '@hydrabyte/shared';
import axios from 'axios';

const execAsync = promisify(exec);

/**
 * Hardware detection service for worker nodes
 */
@Injectable()
export class HardwareService {
  private readonly logger = new Logger(HardwareService.name);

  /**
   * Get operating system information
   */
  async getOsInfo(): Promise<IOsInfo> {
    const platform = os.platform() as 'linux' | 'darwin' | 'win32';
    const arch = os.arch() as 'x64' | 'arm64';

    let distro = 'Unknown';
    let version = os.release();
    const kernel = os.release();

    // Detect Linux distribution
    if (platform === 'linux') {
      try {
        const { stdout } = await execAsync('cat /etc/os-release');
        const lines = stdout.split('\n');

        for (const line of lines) {
          if (line.startsWith('NAME=')) {
            distro = line.split('=')[1].replace(/"/g, '');
          }
          if (line.startsWith('VERSION=')) {
            version = line.split('=')[1].replace(/"/g, '');
          }
        }
      } catch (error) {
        this.logger.warn('Could not detect Linux distribution');
      }
    } else if (platform === 'darwin') {
      distro = 'macOS';
      version = os.release();
    } else if (platform === 'win32') {
      distro = 'Windows';
    }

    return {
      platform,
      distro,
      version,
      arch,
      kernel,
    };
  }

  /**
   * Get CPU information
   */
  getCpuInfo(): { cores: number; model: string } {
    const cpus = os.cpus();
    return {
      cores: cpus.length,
      model: cpus[0]?.model || 'Unknown',
    };
  }

  /**
   * Get RAM information (in MB)
   */
  getRamInfo(): { total: number; free: number; used: number; usage: number } {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      total: Math.round(totalMem / 1024 / 1024), // Convert to MB
      free: Math.round(freeMem / 1024 / 1024),
      used: Math.round(usedMem / 1024 / 1024),
      usage: Math.round((usedMem / totalMem) * 100),
    };
  }

  /**
   * Get disk information (in MB)
   */
  async getDiskInfo(): Promise<{ total: number; used: number; free: number; usage: number }> {
    try {
      if (os.platform() === 'linux' || os.platform() === 'darwin') {
        const { stdout } = await execAsync('df -m / | tail -1');
        const parts = stdout.trim().split(/\s+/);

        const total = parseInt(parts[1], 10);
        const used = parseInt(parts[2], 10);
        const free = parseInt(parts[3], 10);
        const usage = parseInt(parts[4]?.replace('%', ''), 10) || 0;

        return { total, used, free, usage };
      }
    } catch (error) {
      this.logger.warn('Could not get disk info');
    }

    return { total: 0, used: 0, free: 0, usage: 0 };
  }

  /**
   * Detect GPU devices using nvidia-smi
   */
  async detectGpuDevices(): Promise<IGpuDevice[]> {
    const gpuDevices: IGpuDevice[] = [];

    try {
      const nvidiaSmiPath = process.env['NVIDIA_SMI_PATH'] || 'nvidia-smi';

      // Query GPU information
      const query = [
        'index',
        'name',
        'memory.total',
        'pci.bus_id',
        'driver_version',
        'cuda_version'
      ].join(',');

      const { stdout } = await execAsync(
        `${nvidiaSmiPath} --query-gpu=${query} --format=csv,noheader,nounits`
      );

      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());

        if (parts.length >= 6) {
          gpuDevices.push({
            deviceId: parts[0],
            model: parts[1],
            memoryTotal: parseInt(parts[2], 10),
            pcieBusId: parts[3],
            driverVersion: parts[4],
            cudaVersion: parts[5],
          });
        }
      }

      this.logger.log(`Detected ${gpuDevices.length} GPU device(s)`);
    } catch (error) {
      this.logger.warn('No NVIDIA GPUs detected or nvidia-smi not available');
    }

    return gpuDevices;
  }

  /**
   * Get GPU metrics
   */
  async getGpuMetrics(): Promise<IGpuDevice[]> {
    const gpuDevices: IGpuDevice[] = [];

    try {
      const nvidiaSmiPath = process.env['NVIDIA_SMI_PATH'] || 'nvidia-smi';

      const query = [
        'index',
        'name',
        'memory.total',
        'memory.used',
        'pci.bus_id',
        'driver_version',
        'cuda_version',
        'utilization.gpu',
        'temperature.gpu',
        'power.draw',
        'power.limit'
      ].join(',');

      const { stdout } = await execAsync(
        `${nvidiaSmiPath} --query-gpu=${query} --format=csv,noheader,nounits`
      );

      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());

        if (parts.length >= 11) {
          const memoryTotal = parseInt(parts[2], 10);
          const memoryUsed = parseInt(parts[3], 10);

          gpuDevices.push({
            deviceId: parts[0],
            model: parts[1],
            memoryTotal,
            memoryUsed,
            memoryUsage: Math.round((memoryUsed / memoryTotal) * 100),
            pcieBusId: parts[4],
            driverVersion: parts[5],
            cudaVersion: parts[6],
            utilization: parseInt(parts[7], 10),
            temperature: parseInt(parts[8], 10),
            powerDraw: parseFloat(parts[9]),
            powerLimit: parseFloat(parts[10]),
            status: 'active',
            processes: [], // TODO: Get GPU processes
            errors: [],
          });
        }
      }
    } catch (error) {
      this.logger.warn('Could not get GPU metrics');
    }

    return gpuDevices;
  }

  /**
   * Get container runtime information
   */
  async getContainerRuntime(): Promise<IContainerRuntime> {
    try {
      // Try Docker
      const { stdout } = await execAsync('docker version --format "{{.Server.Version}}"');
      const version = stdout.trim();

      return {
        type: 'docker',
        version,
        rootDir: '/var/lib/docker',
      };
    } catch (error) {
      this.logger.warn('Docker not available');
    }

    // Fallback
    return {
      type: 'docker',
      version: 'unknown',
      rootDir: '/var/lib/docker',
    };
  }

  /**
   * Get public IP address
   */
  async getPublicIpAddress(): Promise<string> {
    const services = [
      'https://api.ipify.org?format=json',
      'https://icanhazip.com',
      'https://api.my-ip.io/ip',
    ];

    for (const service of services) {
      try {
        const response = await axios.get(service, { timeout: 5000 });
        const data = response.data;

        // Handle different response formats
        if (typeof data === 'string') {
          return data.trim();
        } else if (data.ip) {
          return data.ip;
        }
      } catch (error) {
        continue; // Try next service
      }
    }

    return 'unknown';
  }

  /**
   * Get network interface IP address
   */
  getPrivateIpAddress(): string {
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name];
      if (!iface) continue;

      for (const addr of iface) {
        // Skip internal and IPv6 addresses
        if (addr.family === 'IPv4' && !addr.internal) {
          return addr.address;
        }
      }
    }

    return '127.0.0.1';
  }

  /**
   * Get system uptime in seconds
   */
  getUptimeSeconds(): number {
    return Math.floor(os.uptime());
  }

  /**
   * Get CPU usage percentage
   */
  getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - (100 * idle) / total;

    return Math.round(usage);
  }
}
