import { IsString, IsNotEmpty, IsObject, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '../../enum/websocket';
import { ISystemMetrics } from '../../interfaces/websocket';

/**
 * Metrics data
 */
export class NodeMetricsDataDto {
  @IsString()
  @IsNotEmpty()
  nodeId!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  cpu!: ISystemMetrics['cpu'];

  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  memory!: ISystemMetrics['memory'];

  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  disk!: ISystemMetrics['disk'];

  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  network!: ISystemMetrics['network'];

  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  gpuDevices!: ISystemMetrics['gpuDevices'];
}

/**
 * Metrics message (Worker → Controller)
 */
export class NodeMetricsDto {
  @IsEnum(MessageType)
  type!: MessageType.TELEMETRY_METRICS;

  @IsString()
  @IsNotEmpty()
  messageId!: string;

  @IsString()
  @IsNotEmpty()
  timestamp!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => NodeMetricsDataDto)
  data!: NodeMetricsDataDto;
}
