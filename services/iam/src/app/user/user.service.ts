import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseService } from '@hydrabyte/base';
import { User } from './user.schema';
import { CreateOrganizationDTO, UpdateOrganizationDTO } from '../organization/organization.dto';

@Injectable()
export class UsersService extends BaseService<User,  CreateOrganizationDTO, UpdateOrganizationDTO> {
  constructor(@InjectModel(User.name) UserModel: Model<User>) {
    super(UserModel);
  }
}
