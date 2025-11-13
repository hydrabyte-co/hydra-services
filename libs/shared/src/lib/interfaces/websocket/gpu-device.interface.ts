/**
 * GPU device information
 */
export interface IGpuDevice {
  deviceId: string; // '0', '1', etc.
  model: string; // 'NVIDIA RTX 4090'
  memoryTotal: number; // MB
  memoryUsed?: number; // MB (for metrics)
  memoryUsage?: number; // Percent (for metrics)
  pcieBusId: string; // '0000:01:00.0'
  cudaVersion: string; // '12.2'
  driverVersion: string; // '535.129.03'

  // Additional metrics (for telemetry.metrics)
  utilization?: number; // Percent
  temperature?: number; // Celsius
  powerDraw?: number; // Watts
  powerLimit?: number; // Watts
  processes?: IGpuProcess[];
  status?: 'active' | 'idle' | 'error';
  errors?: string[];
}

/**
 * GPU process information
 */
export interface IGpuProcess {
  pid: number;
  processName: string;
  memoryUsed: number; // MB
}

/**
 * GPU status summary (for heartbeat)
 */
export interface IGpuStatus {
  deviceId: string;
  utilization: number; // Percent
  status: 'active' | 'idle' | 'error';
}
