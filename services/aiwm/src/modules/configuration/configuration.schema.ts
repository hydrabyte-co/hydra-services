import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@hydrabyte/base';
import { ConfigKey } from '@hydrabyte/shared';

/**
 * Configuration Schema
 *
 * Stores system configuration key-value pairs.
 * V2: Simplified design - plain text storage, no encryption.
 */
@Schema({ timestamps: true })
export class Configuration extends BaseSchema {
  @Prop({
    required: true,
    enum: Object.values(ConfigKey),
    unique: true,
    index: true,
  })
  key!: string; // ConfigKey enum value

  @Prop({ required: true })
  value!: string; // Plain text value (no encryption)

  @Prop({ default: true, index: true })
  isActive!: boolean; // Enable/disable configuration

  @Prop()
  notes?: string; // Admin notes

  // BaseSchema provides:
  // - owner (orgId, userId, groupId, agentId, appId)
  // - createdBy, updatedBy
  // - deletedAt (soft delete)
  // - createdAt, updatedAt (timestamps: true)
}

export const ConfigurationSchema =
  SchemaFactory.createForClass(Configuration);

// Indexes
ConfigurationSchema.index({ key: 1 });
ConfigurationSchema.index({ isActive: 1 });
ConfigurationSchema.index({ deletedAt: 1 });

// Compound index for efficient queries
ConfigurationSchema.index({ isActive: 1, deletedAt: 1 });
