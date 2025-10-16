import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, IsObject } from 'class-validator';

/**
 * Query parameters for pagination, filtering, and sorting
 */
export class PaginationQueryDto {
  @ApiProperty({
    description: 'Page number (1-based)',
    required: false,
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    default: 10,
    minimum: 1,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({
    description: 'Filter criteria as JSON object',
    required: false,
    example: { isActive: true },
  })
  @IsOptional()
  @IsObject()
  filter?: Record<string, unknown>;

  @ApiProperty({
    description: 'Sort criteria as JSON object (1 for asc, -1 for desc)',
    required: false,
    example: { createdAt: -1 },
  })
  @IsOptional()
  @IsObject()
  sort?: Record<string, 1 | -1>;
}

/**
 * Response wrapper for paginated results
 */
export class PaginationResponseDto<T> {
  @ApiProperty({ description: 'Array of data items' })
  data: T[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: { page: 1, limit: 10, total: 100 },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
