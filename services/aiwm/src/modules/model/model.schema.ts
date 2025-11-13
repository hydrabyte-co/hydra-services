import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';

export type ModelDocument = Model & Document;

@Schema({ timestamps: true })
export class Model extends BaseSchema {
  @Prop({ required: true, unique: true })
  modelId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  version: string;

  @Prop({ required: true, enum: ['llm', 'diffusion', 'embedding', 'classifier'] })
  type: string;

  @Prop({ required: true, enum: ['pytorch', 'tensorflow', 'onnx', 'huggingface'] })
  framework: string;

  @Prop({ required: true })
  repository: string;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  fileSize: number;

  @Prop({ default: false })
  isDownloaded: boolean;

  @Prop()
  downloadPath?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 'queued' })
  status: string;

  @Prop({ default: 0 })
  downloadProgress: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Node', required: true })
  nodeId: string;

  @Prop()
  tags?: string[];

  
  @Prop({ default: 0 })
  totalInference: number;

  @Prop({ default: 0 })
  totalTokens: number;

  @Prop({ default: 0 })
  totalProcessingTime: number;
}

export const ModelSchema = SchemaFactory.createForClass(Model);