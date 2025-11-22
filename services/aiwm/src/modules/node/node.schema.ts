import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';

export type NodeDocument = Node & Document;

export interface GPUDevice {
  deviceId: string;
  model: string;
  memoryTotal: number;
  memoryFree: number;
  utilization: number;
  temperature: number;
}

export interface TokenMetadata {
  tokenGeneratedAt?: Date;
  tokenExpiresAt?: Date;
  tokenLastUsed?: Date;
}

@Schema({ timestamps: true })
export class Node extends BaseSchema {
  @Prop({ required: true })
  name: string;

  @Prop([{ type: String, enum: ['controller', 'worker', 'proxy', 'storage'] }])
  role: string[];

  @Prop({
    required: true,
    enum: ['pending', 'installing', 'online', 'offline', 'maintenance'],
    default: 'pending'
  })
  status: string;

  @Prop({ default: false })
  isLocal: boolean;

  @Prop()
  vpnIp?: string;

  @Prop({ default: false })
  websocketConnected: boolean;

  @Prop({ default: () => new Date() })
  lastHeartbeat: Date;

  @Prop([{
    deviceId: String,
    model: String,
    memoryTotal: Number,
    memoryFree: Number,
    utilization: Number,
    temperature: Number,
  }])
  gpuDevices?: GPUDevice[];

  @Prop()
  cpuCores?: number;

  @Prop()
  cpuModel?: string;

  @Prop()
  ramTotal?: number;

  @Prop()
  ramFree?: number;

  @Prop()
  diskTotal?: number;

  @Prop()
  hostname?: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  publicIpAddress?: string;

  @Prop()
  os?: string;

  @Prop()
  daemonVersion?: string;

  @Prop()
  containerRuntime?: string;

  @Prop()
  uptimeSeconds?: number;

  @Prop({ type: Object })
  tokenMetadata?: TokenMetadata;

  @Prop()
  lastSeenAt?: Date;

  @Prop()
  lastMetricsAt?: Date;

  @Prop()
  cpuUsage?: number;

  @Prop()
  ramUsage?: number;
}

export const NodeSchema = SchemaFactory.createForClass(Node);