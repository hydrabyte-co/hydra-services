import { IsNotEmpty, Matches, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationDTO {
  @ApiProperty({
    description: 'Organization name (lowercase alphanumeric with hyphens)',
    example: 'acme-corp',
    pattern: '^[a-z0-9-]+$',
  })
  @IsNotEmpty({ message: 'Name is required' })
  @Matches(/^[a-zA-Z0-9-]+$/, { message: 'Name must match [a-zA-Z0-9-]+' })
  name: string;

  @ApiProperty({
    description: 'Organization description',
    example: 'ACME Corporation - Leading in innovation',
    required: false,
  })
  @IsOptional()
  @IsString()
  description: string;
}

export class UpdateOrganizationDTO {
  @ApiProperty({
    description: 'Organization name (lowercase alphanumeric with hyphens)',
    example: 'acme-corp-updated',
    pattern: '^[a-z0-9-]+$',
    required: false,
  })
  @IsOptional()
  @Matches(/^[a-z0-9-]+$/, { message: 'Name must match [a-z0-9-]+' })
  name?: string;

  @ApiProperty({
    description: 'Organization description',
    example: 'Updated description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
