/**
 * Zod schemas for AgentManagement tools
 */

import * as z from 'zod';

// Agent status enum
const AgentStatusEnum = z.enum(['active', 'inactive', 'blocked']);

// Agent type enum
const AgentTypeEnum = z.enum(['default', 'custom']);

/**
 * Schema for listing agents
 */
export const ListAgentsSchema = z.object({
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
  name: z
    .string()
    .optional()
    .describe('Optional: Filter by agent name'),
  tags: z
    .string()
    .optional()
    .describe('Optional: Filter by tags (comma-separated)'),
  description: z
    .string()
    .optional()
    .describe('Optional: Filter by description (full-text search)'),
  status: AgentStatusEnum.optional().describe('Optional: Filter by status (active, inactive, blocked)'),
  type: AgentTypeEnum.optional().describe('Optional: Filter by type (default, custom)'),
});
