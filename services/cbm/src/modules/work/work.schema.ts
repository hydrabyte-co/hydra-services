import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';

export type WorkDocument = Work & MongooseDocument;

/**
 * ReporterAssignee - Entity reference for reporter/assignee
 * Can reference either user or agent
 */
export interface ReporterAssignee {
  type: 'agent' | 'user';
  id: string;
}

/**
 * Work - Work/task management entity
 * Supports 3 types: epic, task, subtask
 * Uses MongoDB _id as the primary identifier
 */
@Schema({ timestamps: true })
export class Work extends BaseSchema {
  @Prop({ required: true, maxlength: 200 })
  title!: string; // Work title

  @Prop({ maxlength: 500 })
  summary?: string; // Short summary

  @Prop({ maxlength: 10000 })
  description?: string; // Detailed description (markdown)

  @Prop({ required: true, enum: ['epic', 'task', 'subtask'] })
  type!: string; // Work type

  @Prop({ type: String })
  projectId?: string; // Optional project reference

  @Prop({ type: Object, required: true })
  reporter!: ReporterAssignee; // Who reported the work

  @Prop({ type: Object })
  assignee?: ReporterAssignee; // Who is assigned to the work

  @Prop({ type: Date })
  dueDate?: Date; // Due date

  @Prop({ type: Date })
  startAt?: Date; // Start time (for agent scheduled execution)

  @Prop({
    required: true,
    enum: ['backlog', 'todo', 'in_progress', 'blocked', 'cancelled', 'review', 'done'],
    default: 'backlog'
  })
  status!: string; // Work status

  @Prop({ type: [String], default: [] })
  blockedBy!: string[]; // Array of Work IDs that block this work

  @Prop({ type: String })
  parentId?: string; // Parent Work ID (for subtasks)

  @Prop({ type: [String], default: [] })
  documents!: string[]; // Array of document IDs

  // BaseSchema provides: owner, createdBy, updatedBy, deletedAt, metadata, timestamps
  // _id is automatically provided by MongoDB
}

export const WorkSchema = SchemaFactory.createForClass(Work);

// Indexes for performance
WorkSchema.index({ status: 1 });
WorkSchema.index({ type: 1 });
WorkSchema.index({ projectId: 1 });
WorkSchema.index({ 'reporter.id': 1 });
WorkSchema.index({ 'assignee.id': 1 });
WorkSchema.index({ parentId: 1 });
WorkSchema.index({ createdAt: -1 });
WorkSchema.index({ title: 'text', summary: 'text', description: 'text' }); // Full-text search
