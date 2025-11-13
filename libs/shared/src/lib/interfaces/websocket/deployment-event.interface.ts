/**
 * Deployment event
 */
export interface IDeploymentEvent {
  timestamp: string; // ISO 8601
  event: string; // Event name (e.g., 'status_changed', 'container_started')
  message: string; // Description
  severity: 'debug' | 'info' | 'warn' | 'error';
}
