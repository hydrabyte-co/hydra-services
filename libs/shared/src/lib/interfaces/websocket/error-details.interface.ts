/**
 * Error details
 */
export interface IErrorDetails {
  code: string; // Error code (e.g., '2004')
  message: string; // Human-readable message
  details?: Record<string, any>; // Additional context
  retryable: boolean; // Can client retry?
  retryAfter?: number; // Seconds to wait before retry
}

/**
 * Complete error response structure
 */
export interface IErrorResponse {
  status: 'error';
  error: IErrorDetails;
  timestamp: string; // ISO 8601
}
