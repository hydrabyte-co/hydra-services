import {
  IsString,
  IsNotEmpty,
  IsObject,
  ValidateNested,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType, CommandStatus } from '../../enum/websocket';
import { IMessageMetadata, IErrorDetails } from '../../interfaces/websocket';

/**
 * Command result data (success)
 */
export class CommandResultDataDto {
  @IsString()
  @IsNotEmpty()
  originalMessageId!: string; // ID of the command message

  @IsString()
  @IsNotEmpty()
  deploymentId!: string; // Or modelId, jobId, etc.

  @IsEnum(CommandStatus)
  status!: CommandStatus.SUCCESS | CommandStatus.ERROR;

  @IsObject()
  @IsOptional()
  result?: Record<string, any>; // Success result data

  @IsObject()
  @IsOptional()
  error?: IErrorDetails; // Error details if status is ERROR

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number; // Progress percentage (0-100) for partial results
}

/**
 * Command result message (Worker → Controller)
 */
export class CommandResultDto {
  @IsEnum(MessageType)
  type!: MessageType.COMMAND_RESULT;

  @IsString()
  @IsNotEmpty()
  messageId!: string;

  @IsString()
  @IsNotEmpty()
  timestamp!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CommandResultDataDto)
  data!: CommandResultDataDto;

  @IsOptional()
  @IsObject()
  metadata?: IMessageMetadata;
}
