import { WsLogLevel, WsLogSource } from '../../enum/websocket';

/**
 * Log entry
 */
export interface ILogEntry {
  timestamp: string; // ISO 8601
  level: WsLogLevel;
  source: WsLogSource;
  message: string;
}
