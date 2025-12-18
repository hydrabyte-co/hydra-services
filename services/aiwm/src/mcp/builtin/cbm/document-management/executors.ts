/**
 * Executors for DocumentManagement tools
 */

import { Logger } from '@nestjs/common';
import { ExecutionContext, ToolResponse } from '../../../types';
import {
  makeServiceRequest,
  formatToolResponse,
  buildQueryString,
} from '../../../utils';

const logger = new Logger('DocumentManagementExecutors');

/**
 * Execute create document
 */
export async function executeCreateDocument(
  args: {
    summary: string;
    content: string;
    type: 'html' | 'text' | 'markdown' | 'json';
    labels?: string[];
    status?: 'draft' | 'published' | 'archived';
    scope?: 'public' | 'org' | 'private';
  },
  context: ExecutionContext
): Promise<ToolResponse> {
  try {
    const cbmBaseUrl = context.cbmBaseUrl || 'http://localhost:3001';
    logger.debug(`🔍 CreateDocument executor - cbmBaseUrl from context: ${context.cbmBaseUrl}`);
    logger.debug(`🔍 CreateDocument executor - Using URL: ${cbmBaseUrl}`);

    const response = await makeServiceRequest(`${cbmBaseUrl}/documents`, {
      method: 'POST',
      context,
      body: JSON.stringify(args),
    });

    return formatToolResponse(response);
  } catch (error: any) {
    logger.error('Error creating document:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error creating document: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Execute list documents
 */
export async function executeListDocuments(
  args: {
    page?: number;
    limit?: number;
    search?: string;
    type?: 'html' | 'text' | 'markdown' | 'json';
    status?: 'draft' | 'published' | 'archived';
    scope?: 'public' | 'org' | 'private';
  },
  context: ExecutionContext
): Promise<ToolResponse> {
  try {
    const cbmBaseUrl = context.cbmBaseUrl || 'http://localhost:3001';
    const queryString = buildQueryString(args);
    const response = await makeServiceRequest(
      `${cbmBaseUrl}/documents${queryString}`,
      {
        method: 'GET',
        context,
      }
    );

    return formatToolResponse(response);
  } catch (error: any) {
    logger.error('Error listing documents:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error listing documents: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Execute get document by ID
 */
export async function executeGetDocument(
  args: { id: string },
  context: ExecutionContext
): Promise<ToolResponse> {
  try {
    const cbmBaseUrl = context.cbmBaseUrl || 'http://localhost:3001';
    const response = await makeServiceRequest(
      `${cbmBaseUrl}/documents/${args.id}`,
      {
        method: 'GET',
        context,
      }
    );

    return formatToolResponse(response);
  } catch (error: any) {
    logger.error('Error getting document:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error getting document: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Execute get document content
 */
export async function executeGetDocumentContent(
  args: { id: string },
  context: ExecutionContext
): Promise<ToolResponse> {
  try {
    const cbmBaseUrl = context.cbmBaseUrl || 'http://localhost:3001';
    const response = await makeServiceRequest(
      `${cbmBaseUrl}/documents/${args.id}/content`,
      {
        method: 'GET',
        context,
      }
    );

    return formatToolResponse(response);
  } catch (error: any) {
    logger.error('Error getting document content:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error getting document content: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Execute update document metadata
 */
export async function executeUpdateDocument(
  args: {
    id: string;
    summary?: string;
    labels?: string[];
    status?: 'draft' | 'published' | 'archived';
    scope?: 'public' | 'org' | 'private';
  },
  context: ExecutionContext
): Promise<ToolResponse> {
  try {
    const cbmBaseUrl = context.cbmBaseUrl || 'http://localhost:3001';
    const { id, ...updateData } = args;
    const response = await makeServiceRequest(
      `${cbmBaseUrl}/documents/${id}`,
      {
        method: 'PATCH',
        context,
        body: JSON.stringify(updateData),
      }
    );

    return formatToolResponse(response);
  } catch (error: any) {
    logger.error('Error updating document:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error updating document: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Execute update document content
 */
export async function executeUpdateDocumentContent(
  args: {
    id: string;
    operation:
      | 'replace'
      | 'find-replace-text'
      | 'find-replace-regex'
      | 'find-replace-markdown'
      | 'append'
      | 'append-after-text'
      | 'append-to-section';
    content: string;
    findText?: string;
    findPattern?: string;
    sectionTitle?: string;
  },
  context: ExecutionContext
): Promise<ToolResponse> {
  try {
    const cbmBaseUrl = context.cbmBaseUrl || 'http://localhost:3001';
    const { id, ...updateData } = args;
    const response = await makeServiceRequest(
      `${cbmBaseUrl}/documents/${id}/content`,
      {
        method: 'PATCH',
        context,
        body: JSON.stringify(updateData),
      }
    );

    return formatToolResponse(response);
  } catch (error: any) {
    logger.error('Error updating document content:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error updating document content: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Execute delete document
 */
export async function executeDeleteDocument(
  args: { id: string },
  context: ExecutionContext
): Promise<ToolResponse> {
  try {
    const cbmBaseUrl = context.cbmBaseUrl || 'http://localhost:3001';
    const response = await makeServiceRequest(
      `${cbmBaseUrl}/documents/${args.id}`,
      {
        method: 'DELETE',
        context,
      }
    );

    return formatToolResponse(response);
  } catch (error: any) {
    logger.error('Error deleting document:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error deleting document: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
