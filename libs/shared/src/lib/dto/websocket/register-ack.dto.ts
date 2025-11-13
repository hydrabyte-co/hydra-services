import { IsString, IsNotEmpty, IsEnum, IsObject, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '../../enum/websocket';
import { IControllerInfo } from '../../interfaces/websocket';

/**
 * Registration acknowledgment data
 */
export class RegisterAckDataDto {
  @IsEnum(['success', 'error'])
  status!: 'success' | 'error';

  @IsString()
  @IsNotEmpty()
  nodeId!: string;

  @IsString()
  @IsNotEmpty()
  registeredAt!: string; // ISO 8601

  // Controller info
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  controllerInfo!: IControllerInfo;

  // Pending commands (if any)
  @IsArray()
  pendingCommands!: any[]; // Array of command messages
}

/**
 * Registration acknowledgment message (Server → Client)
 */
export class RegisterAckDto {
  @IsEnum(MessageType)
  type!: MessageType.REGISTER_ACK;

  @IsString()
  @IsNotEmpty()
  messageId!: string;

  @IsString()
  @IsNotEmpty()
  timestamp!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => RegisterAckDataDto)
  data!: RegisterAckDataDto;
}
