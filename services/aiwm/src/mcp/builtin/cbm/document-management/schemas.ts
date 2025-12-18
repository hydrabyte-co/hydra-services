/**
 * Zod schemas for DocumentManagement tools
 */

import * as z from 'zod';

// Document type enum
const DocumentTypeEnum = z.enum(['html', 'text', 'markdown', 'json']);

// Document status enum
const DocumentStatusEnum = z.enum(['draft', 'published', 'archived']);

// Document scope enum
const DocumentScopeEnum = z.enum(['public', 'org', 'private']);

// Content operation type enum
const ContentOperationEnum = z.enum([
  'replace',
  'find-replace-text',
  'find-replace-regex',
  'find-replace-markdown',
  'append',
  'append-after-text',
  'append-to-section',
]);

/**
 * Schema for creating a new document
 */
export const CreateDocumentSchema = z.object({
  summary: z
    .string()
    .max(500)
    .describe('Document title/summary (max 500 characters)'),
  content: z.string().describe('Main document content'),
  type: DocumentTypeEnum.describe('Content type'),
  labels: z
    .array(z.string())
    .optional()
    .describe('Array of labels for categorization'),
  status: DocumentStatusEnum.optional().describe(
    'Document status (default: draft)'
  ),
  scope: DocumentScopeEnum.optional().describe(
    'Document visibility scope (default: private)'
  ),
});

/**
 * Schema for listing documents
 */
export const ListDocumentsSchema = z.object({
  page: z
    .number()
    .int()
    .positive()
    .optional()
    .default(1)
    .describe('Page number (default: 1)'),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .default(10)
    .describe('Items per page (max 100, default: 10)'),
  search: z.string().optional().describe('Search in summary, content, labels'),
  type: DocumentTypeEnum.optional().describe('Filter by document type'),
  status: DocumentStatusEnum.optional().describe('Filter by status'),
  scope: DocumentScopeEnum.optional().describe('Filter by scope'),
});

/**
 * Schema for getting a document by ID
 */
export const GetDocumentSchema = z.object({
  id: z.string().describe('Document ID'),
});

/**
 * Schema for getting document content
 */
export const GetDocumentContentSchema = z.object({
  id: z.string().describe('Document ID'),
});

/**
 * Schema for updating document metadata
 */
export const UpdateDocumentSchema = z.object({
  id: z.string().describe('Document ID'),
  summary: z.string().max(500).optional().describe('Updated summary'),
  labels: z.array(z.string()).optional().describe('Updated labels'),
  status: DocumentStatusEnum.optional().describe('Updated status'),
  scope: DocumentScopeEnum.optional().describe('Updated scope'),
});

/**
 * Schema for updating document content
 */
export const UpdateDocumentContentSchema = z.object({
  id: z.string().describe('Document ID'),
  operation: ContentOperationEnum.describe('Content manipulation operation'),
  content: z.string().describe('New content or content to append'),
  findText: z
    .string()
    .optional()
    .describe('Text to find (for find-replace operations)'),
  findPattern: z
    .string()
    .optional()
    .describe('Regex pattern to find (for find-replace-regex)'),
  sectionTitle: z
    .string()
    .optional()
    .describe('Section title (for append-to-section in markdown)'),
});

/**
 * Schema for deleting a document
 */
export const DeleteDocumentSchema = z.object({
  id: z.string().describe('Document ID to delete'),
});
