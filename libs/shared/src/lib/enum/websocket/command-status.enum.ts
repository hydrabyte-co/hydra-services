/**
 * Command execution status
 */
export enum CommandStatus {
  PENDING = 'pending',           // Not yet sent
  SENT = 'sent',                 // Sent to worker
  ACKNOWLEDGED = 'acknowledged', // Worker received and processing
  SUCCESS = 'success',           // Completed successfully
  ERROR = 'error',               // Failed with error
  TIMEOUT = 'timeout',           // Timed out
  CANCELLED = 'cancelled',       // Cancelled by user
}
