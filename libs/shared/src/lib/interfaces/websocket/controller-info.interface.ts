/**
 * Controller information sent during registration
 */
export interface IControllerInfo {
  controllerId: string;
  heartbeatInterval: number; // ms - expect heartbeat every X ms
  metricsInterval: number; // ms - expect metrics every X ms
  timezone: string; // 'UTC', 'Asia/Ho_Chi_Minh', etc.
}
