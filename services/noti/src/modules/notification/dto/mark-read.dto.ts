import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * DTO for marking notification as read
 */
export class MarkReadDto {
  @ApiProperty({ description: 'User ID who is marking notification as read' })
  @IsString()
  userId: string;
}
