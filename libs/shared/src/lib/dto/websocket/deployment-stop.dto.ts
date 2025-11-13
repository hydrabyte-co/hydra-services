import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  ValidateNested,
  IsEnum,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '../../enum/websocket';
import { IResourceIdentification, IMessageMetadata } from '../../interfaces/websocket';

/**
 * Deployment stop command data
 */
export class DeploymentStopDataDto {
  @IsBoolean()
  @IsOptional()
  force?: boolean; // true = kill immediately, false = graceful shutdown

  @IsNumber()
  @Min(5)
  @Max(300)
  @IsOptional()
  timeout?: number; // seconds to wait before force kill (default: 30)
}

/**
 * Deployment stop command message (Controller → Worker)
 */
export class DeploymentStopDto {
  @IsEnum(MessageType)
  type!: MessageType.DEPLOYMENT_STOP;

  @IsString()
  @IsNotEmpty()
  messageId!: string;

  @IsString()
  @IsNotEmpty()
  timestamp!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  resource!: IResourceIdentification; // { type: 'deployment', id: 'deploy-abc123' }

  @IsObject()
  @ValidateNested()
  @Type(() => DeploymentStopDataDto)
  data!: DeploymentStopDataDto;

  @IsOptional()
  @IsObject()
  metadata?: IMessageMetadata;
}
