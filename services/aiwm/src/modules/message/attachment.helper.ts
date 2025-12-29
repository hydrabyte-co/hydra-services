/**
 * AttachmentHelper
 * Utility class for parsing and validating message attachments
 *
 * Supported formats:
 * - File URLs: https://s3.amazonaws.com/bucket/file.pdf
 * - CBM Documents: document:doc-xyz789abc
 */
export class AttachmentHelper {
  /**
   * Detect attachment type from string
   * @param attachment - Attachment string to analyze
   * @returns Type of attachment: 'url', 'document', or 'unknown'
   */
  static getType(attachment: string): 'url' | 'document' | 'unknown' {
    if (!attachment || typeof attachment !== 'string') {
      return 'unknown';
    }

    if (attachment.startsWith('http://') || attachment.startsWith('https://')) {
      return 'url';
    }

    if (attachment.startsWith('document:')) {
      return 'document';
    }

    return 'unknown';
  }

  /**
   * Extract document ID from document: prefix
   * @param attachment - Document attachment string
   * @returns Document ID or null if not a document
   */
  static getDocumentId(attachment: string): string | null {
    if (!attachment || typeof attachment !== 'string') {
      return null;
    }

    if (attachment.startsWith('document:')) {
      return attachment.substring('document:'.length);
    }

    return null;
  }

  /**
   * Extract filename from URL
   * @param url - File URL
   * @returns Filename from URL path
   */
  static getFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
      return decodeURIComponent(filename);
    } catch {
      return 'unknown';
    }
  }

  /**
   * Parse attachment string to structured data
   * @param attachment - Attachment string to parse
   * @returns Parsed attachment information
   */
  static parse(attachment: string): {
    type: 'url' | 'document' | 'unknown';
    url?: string;
    documentId?: string;
    filename?: string;
  } {
    const type = this.getType(attachment);

    if (type === 'url') {
      return {
        type: 'url',
        url: attachment,
        filename: this.getFilenameFromUrl(attachment),
      };
    }

    if (type === 'document') {
      return {
        type: 'document',
        documentId: this.getDocumentId(attachment),
      };
    }

    return { type: 'unknown' };
  }

  /**
   * Create document attachment string
   * @param documentId - CBM document ID
   * @returns Formatted document attachment string
   */
  static createDocumentAttachment(documentId: string): string {
    if (!documentId || typeof documentId !== 'string') {
      throw new Error('Invalid document ID');
    }

    return `document:${documentId}`;
  }

  /**
   * Validate attachment string format
   * @param attachment - Attachment string to validate
   * @returns True if valid, false otherwise
   */
  static isValid(attachment: string): boolean {
    if (!attachment || typeof attachment !== 'string') {
      return false;
    }

    const type = this.getType(attachment);

    if (type === 'url') {
      try {
        new URL(attachment);
        return true;
      } catch {
        return false;
      }
    }

    if (type === 'document') {
      const docId = this.getDocumentId(attachment);
      return docId !== null && docId.length > 0;
    }

    return false;
  }

  /**
   * Validate array of attachments
   * @param attachments - Array of attachment strings
   * @returns Validation result with invalid attachments
   */
  static validateAll(
    attachments: string[],
  ): { valid: boolean; invalidAttachments: string[] } {
    if (!Array.isArray(attachments)) {
      return { valid: false, invalidAttachments: [] };
    }

    const invalidAttachments = attachments.filter(
      (att) => !this.isValid(att),
    );

    return {
      valid: invalidAttachments.length === 0,
      invalidAttachments,
    };
  }

  /**
   * Get MIME type hint from URL filename
   * @param url - File URL
   * @returns Guessed MIME type or 'application/octet-stream'
   */
  static guessMimeType(url: string): string {
    const filename = this.getFilenameFromUrl(url).toLowerCase();
    const ext = filename.substring(filename.lastIndexOf('.') + 1);

    const mimeTypes: Record<string, string> = {
      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      csv: 'text/csv',

      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      webp: 'image/webp',

      // Archives
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      tar: 'application/x-tar',
      gz: 'application/gzip',

      // Code
      json: 'application/json',
      xml: 'application/xml',
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      ts: 'application/typescript',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}
