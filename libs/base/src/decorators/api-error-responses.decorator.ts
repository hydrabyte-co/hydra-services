import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import {
  ValidationErrorResponseDto,
  UnauthorizedErrorResponseDto,
  ForbiddenErrorResponseDto,
  NotFoundErrorResponseDto,
  InternalServerErrorResponseDto,
} from '../dto';

/**
 * Apply common error responses to Swagger documentation
 *
 * @param options Configuration for which error responses to include
 * @example
 * @ApiCommonErrors({ auth: true, notFound: true })
 * @Get(':id')
 * async findOne(@Param('id') id: string) { ... }
 */
export function ApiCommonErrors(options?: {
  auth?: boolean;        // Include 401 Unauthorized
  forbidden?: boolean;   // Include 403 Forbidden
  notFound?: boolean;    // Include 404 Not Found
  validation?: boolean;  // Include 400 Bad Request (validation)
  server?: boolean;      // Include 500 Internal Server Error
}) {
  const decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator> = [];

  // Default: include all common errors
  const {
    auth = true,
    forbidden = true,
    notFound = false,
    validation = false,
    server = true,
  } = options || {};

  if (validation) {
    decorators.push(
      ApiResponse({
        status: 400,
        description: 'Bad Request - Validation failed',
        type: ValidationErrorResponseDto,
      })
    );
  }

  if (auth) {
    decorators.push(
      ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token is missing or invalid',
        type: UnauthorizedErrorResponseDto,
      })
    );
  }

  if (forbidden) {
    decorators.push(
      ApiResponse({
        status: 403,
        description: 'Forbidden - User lacks required permissions (RBAC)',
        type: ForbiddenErrorResponseDto,
      })
    );
  }

  if (notFound) {
    decorators.push(
      ApiResponse({
        status: 404,
        description: 'Not Found - Requested resource does not exist',
        type: NotFoundErrorResponseDto,
      })
    );
  }

  if (server) {
    decorators.push(
      ApiResponse({
        status: 500,
        description: 'Internal Server Error - Unexpected error occurred',
        type: InternalServerErrorResponseDto,
      })
    );
  }

  return applyDecorators(...decorators);
}

/**
 * Apply error responses for CREATE operations (POST)
 * Includes: 400, 401, 403, 500
 */
export function ApiCreateErrors() {
  return ApiCommonErrors({
    validation: true,
    auth: true,
    forbidden: true,
    notFound: false,
    server: true,
  });
}

/**
 * Apply error responses for READ operations (GET)
 * Includes: 401, 403, 404, 500
 */
export function ApiReadErrors(options?: { notFound?: boolean }) {
  return ApiCommonErrors({
    validation: false,
    auth: true,
    forbidden: true,
    notFound: options?.notFound ?? true,
    server: true,
  });
}

/**
 * Apply error responses for UPDATE operations (PUT/PATCH)
 * Includes: 400, 401, 403, 404, 500
 */
export function ApiUpdateErrors() {
  return ApiCommonErrors({
    validation: true,
    auth: true,
    forbidden: true,
    notFound: true,
    server: true,
  });
}

/**
 * Apply error responses for DELETE operations
 * Includes: 401, 403, 404, 500
 */
export function ApiDeleteErrors() {
  return ApiCommonErrors({
    validation: false,
    auth: true,
    forbidden: true,
    notFound: true,
    server: true,
  });
}
