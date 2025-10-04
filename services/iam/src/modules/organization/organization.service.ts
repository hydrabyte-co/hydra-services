import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseService, FindManyOptions, FindManyResult } from '@hydrabyte/base';
import { Organization } from './organization.schema';
import { RequestContext } from '@hydrabyte/shared';

@Injectable()
export class OrganizationsService extends BaseService<Organization> {
  constructor(
    @InjectModel(Organization.name) OrganizationModel: Model<Organization>
  ) {
    super(OrganizationModel);
  }

  async findAll(
    options: FindManyOptions,
    context: RequestContext
  ): Promise<FindManyResult<Organization>> {
    if (options.filter) {
      if (options.filter.search) {
        options.filter.$or = [
          { name: { $regex: options.filter.search, $options: 'i' } },
          { description: { $regex: options.filter.search, $options: 'i' } },
        ];
        delete options.filter.search;
      }
    }
    return super.findAll(options, context);
  }
}
