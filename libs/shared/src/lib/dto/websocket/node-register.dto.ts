import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsObject,
  ValidateNested,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType, NodeStatus } from '../../enum/websocket';
import { IGpuDevice, IOsInfo, IContainerRuntime } from '../../interfaces/websocket';

/**
 * Node registration data
 */
export class NodeRegisterDataDto {
  @IsString()
  @IsNotEmpty()
  nodeId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  hostname!: string;

  // Network info
  @IsString()
  @IsNotEmpty()
  ipAddress!: string; // Private/LAN IP

  @IsString()
  @IsNotEmpty()
  publicIpAddress!: string; // Public IP

  // OS info
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  os!: IOsInfo;

  // Hardware specs
  @IsNumber()
  @Min(1)
  cpuCores!: number;

  @IsString()
  @IsNotEmpty()
  cpuModel!: string;

  @IsNumber()
  @Min(1)
  ramTotal!: number; // MB

  @IsNumber()
  @Min(1)
  diskTotal!: number; // MB

  // GPU devices
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  gpuDevices!: IGpuDevice[];

  // Runtime info
  @IsString()
  @IsNotEmpty()
  daemonVersion!: string;

  @IsEnum(NodeStatus)
  nodeStatus!: NodeStatus;

  @IsNumber()
  @Min(0)
  uptimeSeconds!: number;

  // Container runtime
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  containerRuntime!: IContainerRuntime;
}

/**
 * Node registration message (Client → Server)
 */
export class NodeRegisterDto {
  @IsEnum(MessageType)
  type!: MessageType.NODE_REGISTER;

  @IsString()
  @IsNotEmpty()
  messageId!: string;

  @IsString()
  @IsNotEmpty()
  timestamp!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => NodeRegisterDataDto)
  data!: NodeRegisterDataDto;
}
