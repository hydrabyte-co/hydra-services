import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsMongoId } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ description: 'Product name', example: 'iPhone 15 Pro' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Product description', example: 'Latest iPhone with A17 Pro chip' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Product price', example: 999.99 })
  @IsNumber()
  price: number;

  @ApiProperty({ description: 'Stock quantity', example: 100, default: 0 })
  @IsNumber()
  @IsOptional()
  stock?: number;

  @ApiProperty({ description: 'Category ID', example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  categoryId: string;

  @ApiProperty({ description: 'Is product active', example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateProductDto {
  @ApiProperty({ description: 'Product name', example: 'iPhone 15 Pro Max', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Product description', example: 'Updated description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Product price', example: 1099.99, required: false })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiProperty({ description: 'Stock quantity', example: 50, required: false })
  @IsNumber()
  @IsOptional()
  stock?: number;

  @ApiProperty({ description: 'Category ID', example: '507f1f77bcf86cd799439011', required: false })
  @IsMongoId()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ description: 'Is product active', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
