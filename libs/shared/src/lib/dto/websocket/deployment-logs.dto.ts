import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsObject,
  ValidateNested,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '../../enum/websocket';
import { ILogEntry } from '../../interfaces/websocket';

/**
 * Deployment logs data
 */
export class DeploymentLogsDataDto {
  @IsString()
  @IsNotEmpty()
  deploymentId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  logs!: ILogEntry[];

  @IsBoolean()
  moreAvailable!: boolean; // true if more logs exist
}

/**
 * Deployment logs message (Worker → Controller)
 */
export class DeploymentLogsDto {
  @IsEnum(MessageType)
  type!: MessageType.DEPLOYMENT_LOGS;

  @IsString()
  @IsNotEmpty()
  messageId!: string;

  @IsString()
  @IsNotEmpty()
  timestamp!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => DeploymentLogsDataDto)
  data!: DeploymentLogsDataDto;
}
