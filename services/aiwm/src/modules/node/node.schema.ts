import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';

export type NodeDocument = Node & Document;

@Schema({ timestamps: true })
export class Node extends BaseSchema {
  @Prop({ required: true, unique: true })
  nodeId: string;

  @Prop({ required: true })
  name: string;

  @Prop([{ type: String, enum: ['controller', 'worker', 'proxy', 'storage'] }])
  role: string[];

  @Prop({ required: true, enum: ['online', 'offline', 'maintenance'], default: 'offline' })
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

  @Prop({ required: true })
  cpuCores: number;

  @Prop({ required: true })
  ramTotal: number;

  @Prop({ required: true })
  ramFree: number;
}

export const NodeSchema = SchemaFactory.createForClass(Node);