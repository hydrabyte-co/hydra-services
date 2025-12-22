import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';

export class GenerateTextRequestDto {
  @ApiProperty({
    description: 'Mô tả về trường dữ liệu cần generate (system prompt)',
    example: 'Viết mô tả chi tiết một công việc',
  })
  @IsString()
  @IsNotEmpty()
  fieldDescription!: string;

  @ApiProperty({
    description: 'Nội dung input từ người dùng',
    example: 'đăng ký tạm trú tạm vắng',
  })
  @IsString()
  @IsNotEmpty()
  userInput!: string;

  @ApiPropertyOptional({
    description: 'Số ký tự tối đa cho kết quả (optional)',
    example: 200,
    minimum: 10,
    maximum: 2000,
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(2000)
  maxLength?: number;
}

export class GenerateTextResponseDto {
  @ApiProperty({
    description: 'Nội dung được generate bởi AI',
    example: 'Đăng ký tạm trú, tạm vắng là thủ tục hành chính nhằm quản lý...',
  })
  generatedText!: string;

  @ApiProperty({
    description: 'Độ dài ký tự của văn bản được generate',
    example: 156,
  })
  length!: number;

  @ApiPropertyOptional({
    description: 'Có bị truncate do vượt maxLength hay không',
    example: false,
  })
  truncated?: boolean;
}
