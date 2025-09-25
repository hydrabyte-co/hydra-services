import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { BaseController } from '@hydrabyte/base';
import { OrganizationsService } from './organization.service';
import { Organization } from './organization.schema';
import {
  CreateOrganizationDTO,
  UpdateOrganizationDTO,
} from './organization.dto';

@Controller('organizations')
export class OrganizationsController extends BaseController<
  Organization,
  CreateOrganizationDTO,
  UpdateOrganizationDTO
> {
  constructor(
    private readonly organizationsService: OrganizationsService
  ) {
    super(organizationsService);
  }

  /* @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() createDTO: CreateOrganizationDTO): Promise<Organization> {
    console.log('Custom create method in OrganizationsController', createDTO);
    return super.create(createDTO);
  } */
}
