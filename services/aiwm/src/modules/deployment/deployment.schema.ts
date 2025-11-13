import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';
import { Model, ModelDocument } from '../model/model.schema';
import { Node, NodeDocument } from '../node/node.schema';

export type DeploymentDocument = Deployment & Document;

@Schema({ timestamps: true })
export class Deployment extends BaseSchema {
  @Prop({ required: true, unique: true })
  deploymentId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  environment: string;

  @Prop({ required: true })
  status: string;

  @Prop({ required: true })
  modelId: string;

  @Prop({ required: true })
  nodeId: string;

  @Prop({ required: true })
  deploymentType: string;

  @Prop({ default: 0 })
  replicas: number;

  @Prop({ default: 'cpu' })
  hardwareProfile: string;

  
  @Prop({ default: false })
  isRunning: boolean;

  @Prop()
  containerName?: string;

  @Prop()
  containerPort?: number;

  @Prop()
    endpoint?: string;

  
  @Prop({ default: 0 })
  totalInferences: number;

  @Prop({ default: 0 })
  averageLatency: number;

  @Prop({ default: 0 })
  uptime: number;

  @Prop()
  lastHealthCheck?: Date;

  @Prop({ default: [] })
  events: Array<{
    timestamp: Date;
    event: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
  }>;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Model' })
  model: ModelDocument;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Node' })
  node: NodeDocument;
}

export const DeploymentSchema = SchemaFactory.createForClass(Deployment);