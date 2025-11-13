/**
 * Node connection and health status
 */
export enum NodeStatus {
  // Connection states
  ONLINE = 'online',
  OFFLINE = 'offline',
  CONNECTING = 'connecting',
  DISCONNECTED = 'disconnected',

  // Health states
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  ERROR = 'error',

  // Operational states
  READY = 'ready',
  BUSY = 'busy',
  SHUTTING_DOWN = 'shutting_down',
  MAINTENANCE = 'maintenance',
}
