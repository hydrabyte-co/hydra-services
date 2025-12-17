import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsNotEmpty,
  IsMongoId,
  Min,
} from 'class-validator';
import { LicenseType, ServiceName } from '@hydrabyte/shared';

/**
 * DTO for creating a new license record
 * Creates one license for one organization-service pair
 * Only universe.owner can create licenses
 */
export class CreateLicenseDto {
  @ApiProperty({
    description: 'Organization ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  @IsMongoId({ message: 'orgId must be a valid MongoDB ObjectId' })
  orgId: string;

  @ApiProperty({
    description: 'Service name',
    enum: ServiceName,
    example: ServiceName.AIWM,
  })
  @IsEnum(ServiceName, {
    message: `serviceName must be one of: ${Object.values(ServiceName).join(', ')}`,
  })
  @IsNotEmpty()
  serviceName: ServiceName;

  @ApiProperty({
    description: 'License type for the service',
    enum: LicenseType,
    example: LicenseType.FULL,
  })
  @IsEnum(LicenseType, {
    message: `type must be one of: ${Object.values(LicenseType).join(', ')}`,
  })
  @IsNotEmpty()
  type: LicenseType;

  @ApiPropertyOptional({
    description:
      'Maximum quota limit (optional, not enforced in Phase 1)',
    example: 1000,
    nullable: true,
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'quotaLimit must be a positive number or null' })
  quotaLimit?: number | null;

  @ApiPropertyOptional({
    description:
      'Expiration date (optional, not enforced in Phase 1)',
    example: '2025-12-31T23:59:59Z',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Internal notes about this license',
    example: 'Trial period - 30 days',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for updating an existing license
 * Only universe.owner can update licenses
 * Cannot change orgId or serviceName (these identify the record)
 */
export class UpdateLicenseDto {
  @ApiPropertyOptional({
    description: 'New license type',
    enum: LicenseType,
    example: LicenseType.FULL,
  })
  @IsOptional()
  @IsEnum(LicenseType, {
    message: `type must be one of: ${Object.values(LicenseType).join(', ')}`,
  })
  type?: LicenseType;

  @ApiPropertyOptional({
    description: 'Quota limit (optional)',
    nullable: true,
    example: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'quotaLimit must be a positive number or null' })
  quotaLimit?: number | null;

  @ApiPropertyOptional({
    description: 'Expiration date (optional)',
    nullable: true,
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date | null;

  @ApiPropertyOptional({
    description: 'License status',
    enum: ['active', 'suspended', 'expired'],
    example: 'active',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Update internal notes',
    example: 'Upgraded to full access',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for bulk creating default licenses for an organization
 * Creates licenses for all services at once
 */
export class CreateDefaultLicensesDto {
  @ApiProperty({
    description: 'Organization ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  @IsMongoId({ message: 'orgId must be a valid MongoDB ObjectId' })
  orgId: string;

  @ApiPropertyOptional({
    description: 'Optional notes applied to all default licenses',
    example: 'Default licenses - created automatically',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
