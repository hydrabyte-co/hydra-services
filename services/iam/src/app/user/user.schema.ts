import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@hydrabyte/base';
import { HydratedDocument } from 'mongoose';
import { PasswordHashAlgorithms, UserStatuses } from '../misc/types';


export type UserDocument = HydratedDocument<User>;

@Schema()
export class User extends BaseSchema {
  @Prop()
  username: string;

  @Prop()
  password: {
    hashedValue: string;
    algorithm: PasswordHashAlgorithms;
    ref?: string;
  };

  @Prop()
  status: UserStatuses = UserStatuses.Active;
}

export const UserSchema = SchemaFactory.createForClass(User);
