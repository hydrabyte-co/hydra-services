/**
 * Common types for MCP builtin tools
 */

export interface ExecutionContext {
  token: string;
  userId: string;
  orgId: string;
  agentId?: string;
  groupId?: string;
  roles?: string[];
  // Service URLs from configuration
  cbmBaseUrl?: string;
  iamBaseUrl?: string;
  aiwmBaseUrl?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  type: 'builtin';
  category?: string;
  executor: (args: any, context: ExecutionContext) => Promise<ToolResponse>;
  inputSchema?: any; // Zod schema
}

export interface ToolResponse {
  [key: string]: unknown;
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
