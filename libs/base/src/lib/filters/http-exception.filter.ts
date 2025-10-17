import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  /** HTTP status code */
  statusCode: number;
  /** Error message (user-friendly) */
  message: string;
  /** Validation errors array (for 400 Bad Request) */
  errors?: string[];
  /** Timestamp when error occurred */
  timestamp: string;
  /** Request path that caused the error */
  path: string;
  /** Correlation ID for tracking across services */
  correlationId: string;
}

/**
 * Global exception filter that standardizes all error responses
 *
 * Features:
 * - Consistent error format across all endpoints
 * - Correlation ID generation for request tracking
 * - Validation error extraction from class-validator
 * - Proper logging of all exceptions
 * - HTTP status code detection
 *
 * @example
 * // In main.ts
 * app.useGlobalFilters(new GlobalExceptionFilter());
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode = this.getHttpStatus(exception);
    const message = this.getErrorMessage(exception);
    const errors = this.getValidationErrors(exception);
    const correlationId = this.getCorrelationId(request);

    // Build standardized error response
    const errorResponse: ErrorResponse = {
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
    };

    // Add validation errors array if present
    if (errors && errors.length > 0) {
      errorResponse.errors = errors;
    }

    // Log the error
    this.logError(exception, correlationId, request);

    // Set correlation ID in response header for client tracking
    response.setHeader('x-correlation-id', correlationId);

    // Send standardized error response
    response.status(statusCode).json(errorResponse);
  }

  /**
   * Extract HTTP status code from exception
   */
  private getHttpStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    // Default to 500 Internal Server Error for unknown exceptions
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * Extract error message from exception
   */
  private getErrorMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      // Handle validation errors from class-validator
      if (typeof response === 'object' && 'message' in response) {
        const msg = (response as any).message;

        // If message is an array (validation errors), return generic message
        if (Array.isArray(msg)) {
          return 'Validation failed';
        }

        return msg as string;
      }

      return exception.message;
    }

    // For unknown errors, return generic message (don't expose internal details)
    if (exception instanceof Error) {
      return 'Internal server error';
    }

    return 'An unexpected error occurred';
  }

  /**
   * Extract validation errors from class-validator exceptions
   */
  private getValidationErrors(exception: unknown): string[] | undefined {
    if (!(exception instanceof HttpException)) {
      return undefined;
    }

    const response = exception.getResponse();

    if (typeof response === 'object' && 'message' in response) {
      const msg = (response as any).message;

      // class-validator returns errors as string array
      if (Array.isArray(msg)) {
        return msg;
      }
    }

    return undefined;
  }

  /**
   * Get or generate correlation ID for request tracking
   */
  private getCorrelationId(request: Request): string {
    // Try to get existing correlation ID from request header
    const existingId = request.headers['x-correlation-id'];

    if (existingId && typeof existingId === 'string') {
      return existingId;
    }

    // Generate new correlation ID
    return uuidv4();
  }

  /**
   * Log error details for debugging
   */
  private logError(exception: unknown, correlationId: string, request: Request) {
    const statusCode = this.getHttpStatus(exception);

    // Log level based on status code
    if (statusCode >= 500) {
      // Server errors - log with full stack trace
      this.logger.error(
        `[${correlationId}] ${request.method} ${request.url} - ${statusCode}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception)
      );
    } else if (statusCode >= 400) {
      // Client errors - log as warning
      this.logger.warn(
        `[${correlationId}] ${request.method} ${request.url} - ${statusCode} - ${this.getErrorMessage(exception)}`
      );
    }
  }
}
