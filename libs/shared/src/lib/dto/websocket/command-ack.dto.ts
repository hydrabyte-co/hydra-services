import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  ValidateNested,
  IsEnum,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType, CommandStatus } from '../../enum/websocket';
import { IMessageMetadata } from '../../interfaces/websocket';

/**
 * Command acknowledgment data
 */
export class CommandAckDataDto {
  @IsString()
  @IsNotEmpty()
  originalMessageId!: string; // ID of the command message

  @IsEnum(CommandStatus)
  status!: CommandStatus.ACKNOWLEDGED;

  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedDuration?: number; // seconds
}

/**
 * Command acknowledgment message (Worker → Controller)
 */
export class CommandAckDto {
  @IsEnum(MessageType)
  type!: MessageType.COMMAND_ACK;

  @IsString()
  @IsNotEmpty()
  messageId!: string;

  @IsString()
  @IsNotEmpty()
  timestamp!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CommandAckDataDto)
  data!: CommandAckDataDto;

  @IsOptional()
  @IsObject()
  metadata?: IMessageMetadata;
}
