/**
 * Common utilities for MCP builtin tools
 */

import { Logger } from '@nestjs/common';
import { ExecutionContext, ToolResponse } from './types';

const logger = new Logger('McpUtils');

/**
 * Make an authenticated HTTP request to a service
 */
export async function makeServiceRequest(
  url: string,
  options: RequestInit & {
    context: ExecutionContext;
  }
): Promise<Response> {
  const { context, ...fetchOptions } = options;

  // Prepare headers with JWT token
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${context.token}`,
    ...fetchOptions.headers,
  };

  logger.log(`📡 Making request: ${fetchOptions.method || 'GET'} ${url}`);

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  logger.log(
    `✅ Response received: ${response.status} ${response.statusText}`
  );

  return response;
}

/**
 * Format API response as MCP tool response
 */
export async function formatToolResponse(
  response: Response
): Promise<ToolResponse> {
  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    const errorText = await response.text();
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${response.status} ${response.statusText}\n${errorText}`,
        },
      ],
      isError: true,
    };
  }

  let content: string;
  if (contentType.includes('application/json')) {
    const json = await response.json();
    content = JSON.stringify(json, null, 2);
  } else {
    content = await response.text();
  }

  return {
    content: [
      {
        type: 'text',
        text: content,
      },
    ],
  };
}

/**
 * Build query string from object
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Get service base URL from environment
 */
export function getServiceBaseUrl(serviceName: 'cbm' | 'iam' | 'aiwm'): string {
  const defaultUrls = {
    cbm: 'http://localhost:3001',
    iam: 'http://localhost:3000',
    aiwm: 'http://localhost:3003',
  };

  const envKey = `${serviceName.toUpperCase()}_SERVICE_URL`;
  return process.env[envKey] || defaultUrls[serviceName];
}
