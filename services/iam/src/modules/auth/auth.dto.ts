import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { PasswordRegex, InvalidPasswordMessage } from '../../core/const/iam.const';

export class LoginData {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ChangeUserPasswordData {
  @Matches(PasswordRegex, { message: InvalidPasswordMessage })
  @IsNotEmpty()
  oldPassword: string;

  @Matches(PasswordRegex, { message: InvalidPasswordMessage })
  @IsNotEmpty()
  newPassword: string;
}

export class RefreshTokenData {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}