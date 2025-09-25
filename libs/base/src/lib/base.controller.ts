import {
  Query,
  Body,
  Delete,
  Get,
  Param,
  Post,
  Put,
  BadRequestException,
  NotFoundException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { validateSync } from 'class-validator';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { BaseService, FindManyResult, FindManyOptions } from './base.service';
import { Types, ObjectId } from 'mongoose';
import { PredefinedRole, RequestContext } from '@hydrabyte/shared';

/**
 * Khi kế thừa, luôn truyền class DTO (có decorator class-validator) cho CreateDTO/UpdateDTO để ValidationPipe hoạt động.
 * Ví dụ:
 *   export class OrganizationController extends BaseController<Organization, CreateOrganizationDto, UpdateOrganizationDto> {}
 */
export class BaseController<
  Entity,
  CreateDTO,
  UpdateDTO
> {
  constructor(
    protected readonly service: BaseService<Entity, CreateDTO, UpdateDTO>
  ) {}
  private context: RequestContext = {
    orgId: '',
    groupId: '',
    userId: '',
    agentId: '',
    appId: '',
    roles: [PredefinedRole.UniverseOwner],
  };

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(@Body() createDTO: CreateDTO): Promise<Entity> {
    console.log(typeof createDTO);
     //console.log(validateSync(createDTO));
    return this.service.create(createDTO, this.context);
  }

  @Get()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async findAll(
    @Query() query: {
      page?: number;
      limit?: number;
      sort?: string;
      [key: string]: string | number | boolean | undefined;
    }
  ): Promise<FindManyResult<Entity>> {
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
    return this.service.findAll(findManyOptions, this.context);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Entity | null> {
    const objId = this.convertToObjectId(id);
    const result = await this.service.findById(objId, this.context);
    if (!result || (result as any)?.isDeleted) {
      throw new NotFoundException(`Resource id ${id} not found`);
    } else {
      return result;
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDTO
  ): Promise<Entity | null> {
    const objId = this.convertToObjectId(id);
    return this.service.update(objId, updateDto, this.context);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<Entity | null> {
    const objId = this.convertToObjectId(id);
    return this.service.softDelete(objId, this.context);
  }

  private convertToObjectId(id: string): ObjectId {
    try {
      return new Types.ObjectId(id) as unknown as ObjectId;
    } catch (error) {
      throw new BadRequestException(`Invalid ID format for ObjectId ${id}`);
    }
  }
}

