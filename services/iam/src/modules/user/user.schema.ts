import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@hydrabyte/base';
import { HydratedDocument } from 'mongoose';
import { UserStatuses } from '../../core/enums/user.enum';
import { PasswordHashAlgorithms } from '../../core/enums/other.enum';


export type UserDocument = HydratedDocument<User>;

@Schema()
export class User extends BaseSchema {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({
    type: {
      hashedValue: { type: String, required: true },
      algorithm: { type: String, required: true },
      ref: { type: String, required: false },
    },
    required: true,
  })
  password: {
    hashedValue: string;
    algorithm: PasswordHashAlgorithms;
    ref?: string;
  };

  @Prop({required: true, type: Array})
  roles: string[];

  @Prop({ type: String, enum: Object.values(UserStatuses), default: UserStatuses.Active })
  status: UserStatuses;
}

export const UserSchema = SchemaFactory.createForClass(User);
