import { MessagePriority } from '../../enum/websocket';

/**
 * Message metadata
 */
export interface IMessageMetadata {
  correlationId?: string; // For request-response tracking
  priority?: MessagePriority;
  retryCount?: number;
}
