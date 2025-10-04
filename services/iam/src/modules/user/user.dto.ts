import { Matches, IsNotEmpty, IsObject, IsArray, IsEnum, IsOptional } from "class-validator";
import { UsernameRegex, InvalidUsernameMessage, PasswordRegex, InvalidPasswordMessage } from "../../core/const/iam.const";
import { UserStatuses } from "../../core/enums/user.enum";

export class CreateUserData {
  @Matches(UsernameRegex, {
    message: InvalidUsernameMessage,
  })
  @IsNotEmpty()
  username = '';

  @Matches(PasswordRegex, {
    message: InvalidPasswordMessage,
  })
  @IsNotEmpty()
  password = '';

  @IsArray()
  @IsNotEmpty()
  roles: string[];

  @IsEnum(UserStatuses)
  status: UserStatuses = UserStatuses.Active;
}

export class UpdateUserData {
  @IsEnum(UserStatuses)
  @IsOptional()
  status: UserStatuses = UserStatuses.Active;
}