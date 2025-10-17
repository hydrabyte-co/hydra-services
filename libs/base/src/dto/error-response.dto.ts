import { ApiProperty } from '@nestjs/swagger';

/**
 * Standard error response DTO for Swagger documentation
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
    type: Number,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Validation failed',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp when error occurred',
    example: '2025-10-17T07:50:57.249Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'API path that caused the error',
    example: '/api/categories',
    type: String,
  })
  path: string;

  @ApiProperty({
    description: 'Unique correlation ID for tracking this request across services',
    example: '550ecd9e-022e-4f92-8943-0a5a23eb7512',
    type: String,
  })
  correlationId: string;

  @ApiProperty({
    description: 'Detailed validation errors (only present for 400 Bad Request)',
    example: ['name must be a string', 'description must be a string'],
    type: [String],
    required: false,
  })
  errors?: string[];
}

/**
 * 400 Bad Request - Validation Error Response
 */
export class ValidationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
    type: Number,
  })
  statusCode: 400;

  @ApiProperty({
    description: 'Error message',
    example: 'Validation failed',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'Array of validation error messages',
    example: ['name must be a string', 'description must be a string'],
    type: [String],
  })
  errors: string[];
}

/**
 * 401 Unauthorized Response
 */
export class UnauthorizedErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 401,
    type: Number,
  })
  statusCode: 401;

  @ApiProperty({
    description: 'Error message',
    example: 'Unauthorized',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp when error occurred',
    example: '2025-10-17T07:51:14.367Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'API path that caused the error',
    example: '/api/categories',
    type: String,
  })
  path: string;

  @ApiProperty({
    description: 'Unique correlation ID for request tracking',
    example: '591280e3-825e-4035-b13e-616c1ff46a32',
    type: String,
  })
  correlationId: string;
}

/**
 * 403 Forbidden Response
 */
export class ForbiddenErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 403,
    type: Number,
  })
  statusCode: 403;

  @ApiProperty({
    description: 'Error message',
    example: 'You do not have permission to delete',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp when error occurred',
    example: '2025-10-17T07:52:30.123Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'API path that caused the error',
    example: '/api/categories/123',
    type: String,
  })
  path: string;

  @ApiProperty({
    description: 'Unique correlation ID for request tracking',
    example: '7f8e9d10-3c4a-5b6c-7d8e-9f0a1b2c3d4e',
    type: String,
  })
  correlationId: string;
}

/**
 * 404 Not Found Response
 */
export class NotFoundErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 404,
    type: Number,
  })
  statusCode: 404;

  @ApiProperty({
    description: 'Error message',
    example: 'Category with ID 999999999999999999999999 not found',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp when error occurred',
    example: '2025-10-17T07:51:08.476Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'API path that caused the error',
    example: '/api/categories/999999999999999999999999',
    type: String,
  })
  path: string;

  @ApiProperty({
    description: 'Unique correlation ID for request tracking',
    example: '27c6330b-24cf-4db3-9a9e-c441604d9778',
    type: String,
  })
  correlationId: string;
}

/**
 * 500 Internal Server Error Response
 */
export class InternalServerErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 500,
    type: Number,
  })
  statusCode: 500;

  @ApiProperty({
    description: 'Error message (generic for security)',
    example: 'Internal server error',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp when error occurred',
    example: '2025-10-17T07:53:45.678Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'API path that caused the error',
    example: '/api/categories',
    type: String,
  })
  path: string;

  @ApiProperty({
    description: 'Unique correlation ID for request tracking',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: String,
  })
  correlationId: string;
}
