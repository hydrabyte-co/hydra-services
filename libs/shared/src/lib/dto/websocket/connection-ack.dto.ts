import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { MessageType } from '../../enum/websocket';

/**
 * Connection acknowledgment (Server → Client)
 */
export class ConnectionAckDto {
  @IsEnum(MessageType)
  type!: MessageType.CONNECTION_ACK;

  @IsString()
  @IsNotEmpty()
  messageId!: string;

  @IsString()
  @IsNotEmpty()
  timestamp!: string;

  @IsEnum(['success', 'error'])
  status!: 'success' | 'error';

  // For success
  nodeId?: string;
  controllerId?: string;
  serverVersion?: string;

  // For error
  error?: {
    code: string;
    message: string;
    timestamp: string;
  };
}
