import { Prop, Schema } from '@nestjs/mongoose';

@Schema()
export abstract class BaseSchema {
  @Prop({ type: Object, default: {} })
  metadata: Record<string, never> = {};

  @Prop({ type: Date, default: Date.now })
  createdAt: Date = new Date();

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date = new Date();

  @Prop({ type: Date, default: Date.now })
  deletedAt: Date | null = null;

  @Prop({ type: Object, default: {} })
  owner: {
    orgId: string;
    userId: string;
    agentId: string;
  } = { orgId: '', userId: '', agentId: '' };

  @Prop({ type: Boolean, default: false })
  isDeleted = false;
}
