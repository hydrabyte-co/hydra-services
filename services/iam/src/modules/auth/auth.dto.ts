import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PasswordRegex, InvalidPasswordMessage } from '../../core/const/iam.const';

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