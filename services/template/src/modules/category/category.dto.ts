import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'Electronics' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Category description', example: 'Electronic devices and accessories' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Is category active', example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'Electronics', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Category description', example: 'Electronic devices and accessories', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Is category active', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
