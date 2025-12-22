/**
 * Zod schemas for WorkManagement tools
 */

import * as z from 'zod';

// Work type enum
const WorkTypeEnum = z.enum(['epic', 'task', 'subtask']);

// Work status enum
const WorkStatusEnum = z.enum([
  'backlog',
  'todo',
  'in_progress',
  'blocked',
  'cancelled',
  'review',
  'done',
]);

/**
 * Schema for creating a new work
 */
export const CreateWorkSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(200)
    .describe('Work title (max 200 characters)'),
  description: z
    .string()
    .max(10000)
    .optional()
    .describe('Optional: Detailed description in markdown (max 10000 characters)'),
  type: WorkTypeEnum.describe('Work type: epic, task, or subtask'),
  projectId: z.string().optional().describe('Optional: Project ID'),
  reporter: z
    .string()
    .optional()
    .describe('Optional: Reporter - format: "user:<userId>" or "agent:<agentId>". If not provided, defaults to current agent'),
  assignee: z
    .string()
    .optional()
    .describe('Optional: Assignee - format: "user:<userId>" or "agent:<agentId>"'),
  dueDate: z
    .string()
    .optional()
    .describe('Optional: Due date in ISO 8601 format (e.g., "2025-03-31T23:59:59.000Z")'),
  startAt: z
    .string()
    .optional()
    .describe(
      'Optional: Start time for agent scheduled execution in ISO 8601 format (e.g., "2025-01-15T09:00:00.000Z")'
    ),
  dependencies: z
    .array(z.string())
    .optional()
    .describe('Optional: Array of Work IDs that this work depends on'),
  parentId: z.string().optional().describe('Optional: Parent Work ID (for subtasks)'),
  documents: z.array(z.string()).optional().describe('Optional: Array of document IDs'),
});

/**
 * Schema for listing works
 */
export const ListWorksSchema = z.object({
  page: z
    .number()
    .int()
    .positive()
    .optional()
    .default(1)
    .describe('Optional: Page number (default: 1)'),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .default(10)
    .describe('Optional: Items per page (max 100, default: 10)'),
  search: z
    .string()
    .optional()
    .describe('Optional: Search in title and description (full-text search)'),
  type: WorkTypeEnum.optional().describe('Optional: Filter by work type'),
  status: WorkStatusEnum.optional().describe('Optional: Filter by status'),
  projectId: z.string().optional().describe('Optional: Filter by project ID'),
  reporter: z
    .string()
    .optional()
    .describe('Optional: Filter by reporter - format: "user:<userId>" or "agent:<agentId>"'),
  assignee: z
    .string()
    .optional()
    .describe('Optional: Filter by assignee - format: "user:<userId>" or "agent:<agentId>"'),
});

/**
 * Schema for getting a work by ID
 */
export const GetWorkSchema = z.object({
  id: z.string().describe('Work ID'),
});

/**
 * Schema for updating work metadata
 * Note: Cannot update type, status, or reason (use workflow actions)
 */
export const UpdateWorkSchema = z.object({
  id: z.string().describe('Work ID'),
  title: z
    .string()
    .min(1)
    .max(200)
    .optional()
    .describe('Optional: Updated work title'),
  description: z
    .string()
    .max(10000)
    .optional()
    .describe('Optional: Updated description'),
  projectId: z.string().optional().describe('Optional: Updated project ID'),
  reporter: z
    .string()
    .optional()
    .describe('Optional: Updated reporter - format: "user:<userId>" or "agent:<agentId>"'),
  assignee: z
    .string()
    .optional()
    .describe('Optional: Updated assignee - format: "user:<userId>" or "agent:<agentId>"'),
  dueDate: z.string().optional().describe('Optional: Updated due date in ISO 8601 format'),
  startAt: z.string().optional().describe('Optional: Updated start time in ISO 8601 format'),
  dependencies: z
    .array(z.string())
    .optional()
    .describe('Optional: Updated array of Work IDs'),
  parentId: z.string().optional().describe('Optional: Updated parent Work ID'),
  documents: z.array(z.string()).optional().describe('Optional: Updated array of document IDs'),
});

/**
 * Schema for deleting a work
 */
export const DeleteWorkSchema = z.object({
  id: z.string().describe('Work ID to delete (only allowed when status is done/cancelled)'),
});

/**
 * Schema for starting work
 */
export const StartWorkSchema = z.object({
  id: z.string().describe('Work ID to start (transition from todo to in_progress)'),
});

/**
 * Schema for blocking work
 */
export const BlockWorkSchema = z.object({
  id: z.string().describe('Work ID to block'),
  reason: z
    .string()
    .min(1)
    .max(1000)
    .describe('Reason why the work is being blocked (required, max 1000 characters)'),
});

/**
 * Schema for unblocking work
 */
export const UnblockWorkSchema = z.object({
  id: z.string().describe('Work ID to unblock (transition from blocked to in_progress)'),
});

/**
 * Schema for requesting review
 */
export const RequestReviewForWorkSchema = z.object({
  id: z.string().describe('Work ID to request review (transition from in_progress to review)'),
});

/**
 * Schema for completing work
 */
export const CompleteWorkSchema = z.object({
  id: z.string().describe('Work ID to complete (transition from review to done)'),
});

/**
 * Schema for reopening work
 */
export const ReopenWorkSchema = z.object({
  id: z.string().describe('Work ID to reopen (transition from done to in_progress)'),
});

/**
 * Schema for cancelling work
 */
export const CancelWorkSchema = z.object({
  id: z.string().describe('Work ID to cancel (transition from any status to cancelled)'),
});

/**
 * Schema for assign and move to todo
 */
export const AssignAndTodoWorkSchema = z.object({
  id: z.string().describe('Work ID'),
  assignee: z
    .string()
    .describe('Assignee - format: "user:<userId>" or "agent:<agentId>"'),
});

/**
 * Schema for rejecting review
 */
export const RejectReviewForWorkSchema = z.object({
  id: z.string().describe('Work ID to reject from review'),
  feedback: z
    .string()
    .min(1)
    .max(2000)
    .describe('Feedback explaining why the work was rejected (required, max 2000 characters)'),
});
