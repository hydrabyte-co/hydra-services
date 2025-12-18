/**
 * DocumentManagement tool definitions
 */

import { ToolDefinition } from '../../../types';
import {
  executeCreateDocument,
  executeListDocuments,
  executeGetDocument,
  executeGetDocumentContent,
  executeUpdateDocument,
  executeUpdateDocumentContent,
  executeDeleteDocument,
} from './executors';
import {
  CreateDocumentSchema,
  ListDocumentsSchema,
  GetDocumentSchema,
  GetDocumentContentSchema,
  UpdateDocumentSchema,
  UpdateDocumentContentSchema,
  DeleteDocumentSchema,
} from './schemas';

/**
 * All DocumentManagement tools
 */
export const DocumentManagementTools: ToolDefinition[] = [
  {
    name: 'CreateDocument',
    description:
      'Create a new document with summary, content, type, and optional labels/status/scope',
    type: 'builtin',
    category: 'DocumentManagement',
    executor: executeCreateDocument,
    inputSchema: CreateDocumentSchema,
  },
  {
    name: 'ListDocuments',
    description:
      'List documents with pagination, search, and filters (type, status, scope)',
    type: 'builtin',
    category: 'DocumentManagement',
    executor: executeListDocuments,
    inputSchema: ListDocumentsSchema,
  },
  {
    name: 'GetDocument',
    description: 'Get a specific document by ID with full metadata',
    type: 'builtin',
    category: 'DocumentManagement',
    executor: executeGetDocument,
    inputSchema: GetDocumentSchema,
  },
  {
    name: 'GetDocumentContent',
    description: 'Get document content by ID with appropriate MIME type',
    type: 'builtin',
    category: 'DocumentManagement',
    executor: executeGetDocumentContent,
    inputSchema: GetDocumentContentSchema,
  },
  {
    name: 'UpdateDocument',
    description: 'Update document metadata (summary, labels, status, scope)',
    type: 'builtin',
    category: 'DocumentManagement',
    executor: executeUpdateDocument,
    inputSchema: UpdateDocumentSchema,
  },
  {
    name: 'UpdateDocumentContent',
    description:
      'Update document content with operations: replace, find-replace, append, etc.',
    type: 'builtin',
    category: 'DocumentManagement',
    executor: executeUpdateDocumentContent,
    inputSchema: UpdateDocumentContentSchema,
  },
  {
    name: 'DeleteDocument',
    description: 'Soft delete a document by ID',
    type: 'builtin',
    category: 'DocumentManagement',
    executor: executeDeleteDocument,
    inputSchema: DeleteDocumentSchema,
  },
];
