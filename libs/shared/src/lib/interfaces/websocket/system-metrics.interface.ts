import { IGpuDevice } from './gpu-device.interface';

/**
 * CPU metrics
 */
export interface ICpuMetrics {
  usage: number; // Percent
  cores: number;
  loadAverage: [number, number, number]; // 1min, 5min, 15min
}

/**
 * Memory metrics
 */
export interface IMemoryMetrics {
  total: number; // MB
  used: number; // MB
  free: number; // MB
  cached: number; // MB
  usage: number; // Percent
}

/**
 * Disk metrics
 */
export interface IDiskMetrics {
  total: number; // MB
  used: number; // MB
  free: number; // MB
  usage: number; // Percent
}

/**
 * Network metrics
 */
export interface INetworkMetrics {
  bytesReceived: number; // Bytes since boot
  bytesSent: number; // Bytes
  packetsReceived: number;
  packetsSent: number;
}

/**
 * Complete system metrics
 */
export interface ISystemMetrics {
  cpu: ICpuMetrics;
  memory: IMemoryMetrics;
  disk: IDiskMetrics;
  network: INetworkMetrics;
  gpuDevices: IGpuDevice[];
}
