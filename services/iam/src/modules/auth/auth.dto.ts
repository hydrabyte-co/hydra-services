import { IsNotEmpty, IsOptional, IsString, Matches, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PasswordRegex, InvalidPasswordMessage } from '../../core/const/iam.const';

// Phone number regex: supports formats like +84123456789, 0123456789, +1-234-567-8900
const PhoneNumberRegex = /^(\+?\d{1,3}[-.\s]?)?(\(?\d{1,4}\)?[-.\s]?)?[\d\s.-]{7,15}$/;
const InvalidPhoneNumberMessage = 'Invalid phone number format. Examples: +84123456789, 0123456789, +1-234-567-8900';

export class LoginData {
  @ApiProperty({
    description: 'Username for login',
    example: 'tonyh',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'User password',
    example: '123zXc_-',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ChangeUserPasswordData {
  @ApiProperty({
    description: 'Current password',
    example: '123zXc_-',
    pattern: PasswordRegex.source,
  })
  @Matches(PasswordRegex, { message: InvalidPasswordMessage })
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({
    description: 'New password (8-15 chars, uppercase, lowercase, number, special char)',
    example: 'NewPass123!',
    pattern: PasswordRegex.source,
  })
  @Matches(PasswordRegex, { message: InvalidPasswordMessage })
  @IsNotEmpty()
  newPassword: string;
}

export class RefreshTokenData {
  @ApiProperty({
    description: 'Refresh token received from login',
    example: '0583c49a8ff26132464091da3e1e48d7ae7901af1bd1b6874d...',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class UpdateProfileDto {
  @ApiProperty({
    description: 'Full name of the user',
    example: 'Trần văn a',
    required: false,
  })
  @IsString()
  @IsOptional()
  fullname?: string;

  @ApiProperty({
    description: 'Phone numbers (supports international formats with country code)',
    example: ['0966668888', '+84987654321'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @Matches(PhoneNumberRegex, {
    each: true,
    message: InvalidPhoneNumberMessage,
  })
  phonenumbers?: string[];

  @ApiProperty({
    description: 'User address',
    example: 'Tháp BIDV - 194 Trần Quang Khải, Hoàn Kiếm, Hà Nội',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;
}

export class ProfileResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Username (email)',
    example: 'admin@x-or.cloud',
  })
  username: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'Trần văn a',
    required: false,
  })
  fullname?: string;

  @ApiProperty({
    description: 'Phone numbers',
    example: ['0966668888', '+84987654321'],
    type: [String],
    required: false,
  })
  phonenumbers?: string[];

  @ApiProperty({
    description: 'User address',
    example: 'Tháp BIDV - 194 Trần Quang Khải, Hoàn Kiếm, Hà Nội',
    required: false,
  })
  address?: string;

  @ApiProperty({
    description: 'User metadata',
    example: {
      discordUserId: '123456789012345678',
      discordUsername: 'user#1234',
      telegramUserId: '987654321',
      telegramUsername: '@user',
    },
    required: false,
  })
  metadata?: Record<string, any>;
}