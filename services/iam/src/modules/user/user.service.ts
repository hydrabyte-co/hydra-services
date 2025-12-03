import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseService, FindManyOptions, FindManyResult } from '@hydrabyte/base';
import { PredefinedRole, RequestContext } from '@hydrabyte/shared';
import { User } from './user.schema';
import { PasswordHashAlgorithms } from '../../core/enums/other.enum';
import {
  encodeBase64,
  hashPasswordWithAlgorithm,
} from '../../core/utils/encryption.util';
import { CreateUserData } from './user.dto';
@Injectable()
export class UsersService extends BaseService<User> {
  constructor(@InjectModel(User.name) userModel: Model<User>) {
    super(userModel);
  }

   /**
   * Override findAll to handle statistics aggregation
   */
  async findAll(
    options: FindManyOptions,
    context: RequestContext
  ): Promise<FindManyResult<User>> {
    const findResult = await super.findAll(options, context);
    // Aggregate statistics by status
    const statusStats = await super.aggregate(
      [
        { $match: { ...options.filter } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ],
      context
    );

    // Build statistics object
    const statistics: any = {
      total: findResult.pagination.total,
      byStatus: {},
    };

    // Map status statistics
    statusStats.forEach((stat: any) => {
      statistics.byStatus[stat._id] = stat.count;
    });

    findResult.statistics = statistics;
    return findResult;
  }

  async create(data: CreateUserData, context: RequestContext): Promise<Partial<User>> {
    const user = new User();
    user.username = data.username;
    user.password = {
      hashedValue: '',
      algorithm: PasswordHashAlgorithms.BCrypt,
      ref: `r${encodeBase64(data.password)}`,
    };
    user.status = data.status;
    user.password.hashedValue = await hashPasswordWithAlgorithm(
      data.password,
      user.password.algorithm
    );
    user.owner = {
      orgId: context.orgId,
      groupId: context.groupId,
      userId: context.userId,
      agentId: '',
      appId: '',
    };
    user.roles = data.roles || [];
    return await super.create(user, context);
  }
}
