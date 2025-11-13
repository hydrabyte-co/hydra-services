import {
  IsString,
  IsNotEmpty,
  IsObject,
  ValidateNested,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '../../enum/websocket';
import { IResourceIdentification, IMessageMetadata } from '../../interfaces/websocket';

/**
 * System health check command data
 */
export class SystemHealthCheckDataDto {
  @IsBoolean()
  @IsOptional()
  includeMetrics?: boolean; // Include GPU metrics

  @IsBoolean()
  @IsOptional()
  includeDeployments?: boolean; // Include all deployment statuses
}

/**
 * System health check command message (Controller → Worker)
 */
export class SystemHealthCheckDto {
  @IsEnum(MessageType)
  type!: MessageType.SYSTEM_HEALTH_CHECK;

  @IsString()
  @IsNotEmpty()
  messageId!: string;

  @IsString()
  @IsNotEmpty()
  timestamp!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  resource!: IResourceIdentification; // { type: 'system', id: 'node-abc123' }

  @IsObject()
  @ValidateNested()
  @Type(() => SystemHealthCheckDataDto)
  data!: SystemHealthCheckDataDto;

  @IsOptional()
  @IsObject()
  metadata?: IMessageMetadata;
}
