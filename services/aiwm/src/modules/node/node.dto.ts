import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsNumber, IsDate, IsObject, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GPUDevice {
  @ApiProperty({ description: 'GPU device identifier' })
  @IsString()
  deviceId: string;

  @ApiProperty({ description: 'GPU model name' })
  @IsString()
  model: string;

  @ApiProperty({ description: 'Total memory in GB' })
  @IsNumber()
  memoryTotal: number;

  @ApiProperty({ description: 'Free memory in GB' })
  @IsNumber()
  memoryFree: number;

  @ApiProperty({ description: 'GPU utilization percentage' })
  @IsNumber()
  utilization: number;

  @ApiProperty({ description: 'GPU temperature in Celsius' })
  @IsNumber()
  temperature: number;
}

export class NodeConfig {
  @ApiProperty({ description: 'Controller endpoint URL' })
  @IsString()
  controllerEndpoint: string;

  @ApiProperty({ description: 'Working directory path' })
  @IsString()
  workingDirectory: string;
}

export class CreateNodeDto {
  @ApiProperty({ description: 'Unique node identifier' })
  @IsString()
  nodeId: string;

  @ApiProperty({ description: 'Node name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Node roles', enum: ['controller', 'worker', 'proxy', 'storage'] })
  @IsArray()
  @IsEnum(['controller', 'worker', 'proxy', 'storage'], { each: true })
  role: string[];

  @ApiProperty({ description: 'Whether node is local', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isLocal?: boolean;

  @ApiProperty({ description: 'VPN IP address', required: false })
  @IsOptional()
  @IsString()
  vpnIp?: string;

  @ApiProperty({ description: 'CPU cores count' })
  @IsNumber()
  cpuCores: number;

  @ApiProperty({ description: 'Total RAM in GB' })
  @IsNumber()
  ramTotal: number;

  @ApiProperty({ description: 'Free RAM in GB' })
  @IsNumber()
  ramFree: number;

  @ApiProperty({ description: 'Node configuration', required: false })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  config?: NodeConfig;

  @ApiProperty({ description: 'GPU devices', required: false, type: [GPUDevice] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  gpuDevices?: GPUDevice[];
}

export class UpdateNodeDto {
  @ApiProperty({ description: 'Node name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Node roles', enum: ['controller', 'worker', 'proxy', 'storage'], required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(['controller', 'worker', 'proxy', 'storage'], { each: true })
  role?: string[];

  @ApiProperty({ description: 'Node status', enum: ['online', 'offline', 'maintenance'], required: false })
  @IsOptional()
  @IsEnum(['online', 'offline', 'maintenance'])
  status?: string;

  @ApiProperty({ description: 'Whether node is local', required: false })
  @IsOptional()
  @IsBoolean()
  isLocal?: boolean;

  @ApiProperty({ description: 'VPN IP address', required: false })
  @IsOptional()
  @IsString()
  vpnIp?: string;

  @ApiProperty({ description: 'WebSocket connection status', required: false })
  @IsOptional()
  @IsBoolean()
  websocketConnected?: boolean;

  @ApiProperty({ description: 'Last heartbeat timestamp', required: false })
  @IsOptional()
  @IsDate()
  lastHeartbeat?: Date;

  @ApiProperty({ description: 'CPU cores count', required: false })
  @IsOptional()
  @IsNumber()
  cpuCores?: number;

  @ApiProperty({ description: 'Total RAM in GB', required: false })
  @IsOptional()
  @IsNumber()
  ramTotal?: number;

  @ApiProperty({ description: 'Free RAM in GB', required: false })
  @IsOptional()
  @IsNumber()
  ramFree?: number;

  @ApiProperty({ description: 'GPU devices', required: false, type: [GPUDevice] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  gpuDevices?: GPUDevice[];

  @ApiProperty({ description: 'Node configuration', required: false })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  config?: NodeConfig;
}