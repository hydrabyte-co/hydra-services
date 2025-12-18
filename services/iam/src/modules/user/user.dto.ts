import { Matches, IsNotEmpty, IsObject, IsArray, IsEnum, IsOptional } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';
import { UsernameRegex, InvalidUsernameMessage, PasswordRegex, InvalidPasswordMessage, EmailRegex } from "../../core/const/iam.const";
import { UserStatuses } from "../../core/enums/user.enum";

export class CreateUserData {
  @ApiProperty({
    description: 'Email address (valid email format)',
    example: 'john.doe@example.com',
    pattern: EmailRegex.source,
  })
  @Matches(EmailRegex, {
    message: 'Invalid email address format',
  })
  @IsNotEmpty()
  username = '';

  @ApiProperty({
    description: 'Password (8-15 chars, uppercase, lowercase, number, special char)',
    example: 'SecureP@ss123',
    pattern: PasswordRegex.source,
  })
  @Matches(PasswordRegex, {
    message: InvalidPasswordMessage,
  })
  @IsNotEmpty()
  password = '';

  @ApiProperty({
    description: 'User roles (scope.role format)',
    example: ['universe.owner'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  roles: string[];

  @ApiProperty({
    description: 'User status',
    enum: UserStatuses,
    default: UserStatuses.Active,
    example: UserStatuses.Active,
  })
  @IsEnum(UserStatuses)
  status: UserStatuses = UserStatuses.Active;
}

export class UpdateUserData {
  @ApiProperty({
    description: 'User status',
    enum: UserStatuses,
    required: false,
    example: UserStatuses.Active,
  })
  @IsEnum(UserStatuses)
  @IsOptional()
  status: UserStatuses = UserStatuses.Active;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'New password (8-15 chars, uppercase, lowercase, number, special char)',
    example: 'NewP@ssw0rd',
    pattern: PasswordRegex.source,
  })
  @Matches(PasswordRegex, {
    message: InvalidPasswordMessage,
  })
  @IsNotEmpty()
  newPassword: string;
}
