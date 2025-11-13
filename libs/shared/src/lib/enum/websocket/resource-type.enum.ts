/**
 * Resource types for WebSocket messages
 * Supports multiple resource types for extensibility
 */
export enum ResourceType {
  DEPLOYMENT = 'deployment',
  MODEL = 'model',
  JOB = 'job',
  AGENT = 'agent',
  CONTAINER = 'container',
  SYSTEM = 'system',
  NODE = 'node',
}
