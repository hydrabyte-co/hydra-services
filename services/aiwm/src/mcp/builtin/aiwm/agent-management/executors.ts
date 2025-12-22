/**
 * Executors for AgentManagement tools
 */

import { Logger } from '@nestjs/common';
import { ExecutionContext, ToolResponse } from '../../../types';
import {
  makeServiceRequest,
  formatToolResponse,
  buildQueryString,
} from '../../../utils';

const logger = new Logger('AgentManagementExecutors');

/**
 * Sanitize agent object by removing metadata fields
 */
function sanitizeAgent(agent: any): any {
  const { owner, createdBy, updatedBy, __v, ...sanitized } = agent;
  return sanitized;
}

/**
 * List agents with pagination and filters
 */
export async function executeListAgents(
  args: {
    page?: number;
    limit?: number;
    name?: string;
    tags?: string;
    description?: string;
    status?: string;
    type?: string;
  },
  context: ExecutionContext
): Promise<ToolResponse> {
  const aiwmBaseUrl = context.aiwmBaseUrl || 'http://localhost:3003';
  logger.debug(`🔍 ListAgents executor - aiwmBaseUrl from context: ${context.aiwmBaseUrl}`);
  logger.debug(`🔍 ListAgents executor - Using URL: ${aiwmBaseUrl}`);

  // Build query parameters
  const queryParams: Record<string, any> = {
    page: args.page,
    limit: args.limit,
  };

  // Add filter parameters with filter[] syntax
  if (args.name) {
    queryParams['filter[name]'] = args.name;
  }
  if (args.tags) {
    queryParams['filter[tags]'] = args.tags;
  }
  if (args.description) {
    queryParams['filter[description]'] = args.description;
  }
  if (args.status) {
    queryParams['filter[status]'] = args.status;
  }
  if (args.type) {
    queryParams['filter[type]'] = args.type;
  }

  const queryString = buildQueryString(queryParams);
  const url = `${aiwmBaseUrl}/agents${queryString}`;

  const response = await makeServiceRequest(url, {
    method: 'GET',
    context,
  });

  if (!response.ok) {
    return formatToolResponse(response);
  }

  const data = await response.json();

  // Sanitize agents array if present
  if (data.data && Array.isArray(data.data)) {
    data.data = data.data.map(sanitizeAgent);
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}
