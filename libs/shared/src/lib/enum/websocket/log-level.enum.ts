/**
 * Log levels for deployment logs (WebSocket messages)
 * Note: Prefixed with 'Ws' to avoid conflict with shared LogLevel
 */
export enum WsLogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Log source
 */
export enum WsLogSource {
  STDOUT = 'stdout',
  STDERR = 'stderr',
}
