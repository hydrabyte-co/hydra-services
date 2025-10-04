import {
  Query,
  Body,
  Param,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Req,
} from '@nestjs/common';
import { BaseService, FindManyResult, FindManyOptions } from './base.service';
import { Types, ObjectId } from 'mongoose';
import { PredefinedRole, RequestContext } from '@hydrabyte/shared';

export type FindAllQuery = {
  page?: number;
  limit?: number;
  sort?: string;
  [key: string]: string | number | boolean | undefined;
};

/**
 * Base abstract controller providing common CRUD operations.
 *
 * Usage example:
 * ```typescript
 * @Controller('organizations')
 * export class OrganizationController extends BaseController<Organization> {
 *   constructor(protected readonly organizationService: OrganizationService) {
 *     super(organizationService);
 *   }
 *
 *   @Post()
 *   @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
 *   async create(@Body() createDTO: CreateOrganizationDto): Promise<Organization> {
 *     return this.service.create(createDTO, this.context);
 *   }
 *
 *   @Put(':id')
 *   async update(@Param('id') id: string, @Body() updateDto: UpdateOrganizationDto) {
 *     return super.update(id, updateDto);
 *   }
 * }
 * ```
 */
export abstract class BaseController<Entity> {
  constructor(protected readonly service: BaseService<Entity>) {}

  /**
   * Extract request context from JWT payload in request.
   * Override this method if you need custom context extraction logic.
   */
  protected getContext(req: any): RequestContext {
    if (req.user) {
      return {
        orgId: req.user.orgId || '',
        groupId: req.user.groupId || '',
        userId: req.user.sub || req.user.userId || '',
        agentId: req.user.agentId || '',
        appId: req.user.appId || '',
        roles: req.user.roles || [PredefinedRole.UniverseOwner],
      };
    }
    // Fallback for requests without authentication
    return {
      orgId: '',
      groupId: '',
      userId: '',
      agentId: '',
      appId: '',
      roles: [],
    };
  }

  /**
   * Utility method to parse query string parameters into FindManyOptions.
   * Supports filtering, sorting, pagination with MongoDB operators.
   *
   * Examples:
   * - Filtering: ?name=John&age:gt=18
   * - Sorting: ?sort=createdAt:desc,name:asc
   * - Pagination: ?page=1&limit=20
   */
  protected handleQueryStringForFindMany(query: FindAllQuery): FindManyOptions {
    const findManyOptions: FindManyOptions = {
      filter: {},
      sort: {
        createdAt: -1,
      },
      page: query.page ? parseInt(String(query.page), 10) : 1,
      limit: query.limit ? parseInt(String(query.limit), 10) : 10,
    };

    // Ensure filter is initialized
    if (!findManyOptions.filter) {
      findManyOptions.filter = {};
    }
    for (const key in query) {
      if (Object.prototype.hasOwnProperty.call(query, key)) {
        const value = query[key]?.toString() || '';
        if (key !== 'page' && key !== 'limit' && key !== 'sort') {
          const fields = key.split(':').map((f) => f.trim());
          if (fields.length === 2) {
            const operator = fields[1];
            switch (operator) {
              case 'gt':
                findManyOptions.filter[fields[0]] = { $gt: value };
                break;
              case 'gte':
                findManyOptions.filter[fields[0]] = { $gte: value };
                break;
              case 'lt':
                findManyOptions.filter[fields[0]] = { $lt: value };
                break;
              case 'lte':
                findManyOptions.filter[fields[0]] = { $lte: value };
                break;
              case 'ne':
                findManyOptions.filter[fields[0]] = { $ne: value };
                break;
              case 'in':
                findManyOptions.filter[fields[0]] = { $in: value.split(',') };
                break;
              case 'nin':
                findManyOptions.filter[fields[0]] = { $nin: value.split(',') };
                break;
              case 'regex':
                findManyOptions.filter[fields[0]] = {
                  $regex: value.trim(),
                  $options: 'i',
                };
                break;
              default:
                // Invalid operator, ignore this filter
                break;
            }
            continue;
          }
          findManyOptions.filter[key] = value;
        }
      }
    }
    if (query.sort) {
      // Ensure sort is initialized
      if (!findManyOptions.sort) {
        findManyOptions.sort = {};
      }
      const sortFields = query.sort.split(',').map((f: string) => f.trim());
      sortFields.forEach((field: string) => {
        const fieldValues = field.split(':').map((f: string) => f.trim());
        if (
          fieldValues.length === 2 &&
          (fieldValues[1] === 'asc' || fieldValues[1] === 'desc')
        ) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          findManyOptions.sort![fieldValues[0]] =
            fieldValues[1] === 'asc' ? 1 : -1;
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        findManyOptions.sort![field] = 1;
      });
    }
    return findManyOptions;
  }

  private convertToObjectId(id: string): ObjectId {
    try {
      return new Types.ObjectId(id) as unknown as ObjectId;
    } catch (error) {
      throw new BadRequestException(`Invalid ID format for ObjectId ${id}`);
    }
  }

  private handleError(error: any) {
    return new InternalServerErrorException({
      message: [
        error instanceof Error ? error.message : 'Internal server error',
      ],
      error: 'Internal server error',
      statusCode: 500,
    });
  }

  abstract create(data: any, req: any): Promise<Partial<Entity>>;

  /**
   * Find all entities with filtering, sorting, and pagination.
   * Override in child class and add @Get() decorator.
   */
  async findAll(@Query() query: FindAllQuery, @Req() req: any): Promise<FindManyResult<Entity>> {
    const findManyOptions = this.handleQueryStringForFindMany(query);
    const context = this.getContext(req);
    try {
      return this.service.findAll(findManyOptions, context);
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  /**
   * Find a single entity by ID.
   * Override in child class and add @Get(':id') decorator.
   */
  async findOne(@Param('id') id: string, @Req() req: any): Promise<Entity | null> {
    const objId = this.convertToObjectId(id);
    const context = this.getContext(req);
    try {
      const result = await this.service.findById(objId, context);
      if (!result || (result as any)?.isDeleted) {
        throw new NotFoundException(`Resource id ${id} not found`);
      }
      return result;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  /**
   * Update an entity by ID.
   * Override in child class and add @Put(':id') decorator with proper DTO type.
   */
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<Entity>,
    @Req() req: any
  ): Promise<Entity | null> {
    const objId = this.convertToObjectId(id);
    const context = this.getContext(req);
    try {
      return this.service.update(objId, updateDto, context);
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  /**
   * Soft delete an entity by ID.
   * Override in child class and add @Delete(':id') decorator.
   */
  async delete(@Param('id') id: string, @Req() req: any): Promise<Entity | null> {
    const objId = this.convertToObjectId(id);
    const context = this.getContext(req);
    return this.service.softDelete(objId, context);
  }
}
