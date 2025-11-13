import { IsString, IsNotEmpty, IsObject, IsOptional, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '../../enum/websocket';
import { IMessageMetadata, IResourceIdentification } from '../../interfaces/websocket';

/**
 * Base message structure for all WebSocket messages
 */
export class BaseMessageDto {
  @IsEnum(MessageType)
  @IsNotEmpty()
  type!: MessageType;

  @IsString()
  @IsNotEmpty()
  messageId!: string; // UUID v4

  @IsString()
  @IsNotEmpty()
  timestamp!: string; // ISO 8601

  @IsObject()
  @IsNotEmpty()
  data!: Record<string, any>; // Message payload (type-specific)

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  metadata?: IMessageMetadata;
}

/**
 * Base resource message (for resource-based commands)
 */
export class BaseResourceMessageDto extends BaseMessageDto {
  @IsObject()
  @IsNotEmpty()
  resource!: IResourceIdentification;
}
