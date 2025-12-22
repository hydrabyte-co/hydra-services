/**
 * AgentManagement tool definitions
 */

import { ToolDefinition } from '../../../types';
import { executeListAgents } from './executors';
import { ListAgentsSchema } from './schemas';

/**
 * All AgentManagement tools
 */
export const AgentManagementTools: ToolDefinition[] = [
  {
    name: 'ListAgents',
    description:
      'List agents with pagination and filters (name, tags, description, status, type)',
    type: 'builtin',
    category: 'AgentManagement',
    executor: executeListAgents,
    inputSchema: ListAgentsSchema,
  },
];
