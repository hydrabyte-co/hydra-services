import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseService } from '@hydrabyte/base';
import { Organization } from './organization.schema';
import {
  CreateOrganizationDTO,
  UpdateOrganizationDTO,
} from './organization.dto';

@Injectable()
export class OrganizationsService extends BaseService<
  Organization,
  CreateOrganizationDTO,
  UpdateOrganizationDTO
> {
  constructor(
    @InjectModel(Organization.name) OrganizationModel: Model<Organization>
  ) {
    super(OrganizationModel);
  }
}
