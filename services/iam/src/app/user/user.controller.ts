import { Controller } from '@nestjs/common';
import { BaseController } from '@hydrabyte/base';
import { UsersService } from './user.service';
import { User } from './user.schema';
import { CreateOrganizationDTO, UpdateOrganizationDTO } from '../organization/organization.dto';

@Controller('users')
export class UsersController extends BaseController<User, CreateOrganizationDTO, UpdateOrganizationDTO> {
  constructor(private readonly userService: UsersService) {
    super(userService);
  }
}
