import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  CurrentUser,
  PaginationQueryDto,
  ApiCreateErrors,
  ApiReadErrors,
  ApiUpdateErrors,
  ApiDeleteErrors,
  RequireUniverseRole,
} from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Types } from 'mongoose';
import { ModelService } from './model.service';
import { CreateModelDto, UpdateModelDto } from './model.dto';

/**
 * ModelController
 * Manages model entities for AI/ML models registry
 * Follows modern controller pattern (no BaseController)
 */
@ApiTags('Models')
@ApiBearerAuth()
@Controller('models')
@UseGuards(JwtAuthGuard)
export class ModelController {
  constructor(private readonly modelService: ModelService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new model' })
  @ApiCreateErrors()
  @RequireUniverseRole()
  async create(
    @Body() createDto: CreateModelDto,
    @CurrentUser() context: RequestContext
  ) {
    // Convert nodeId string to ObjectId if present
    const createData: any = { ...createDto };
    if (createDto.nodeId) {
      createData.nodeId = new Types.ObjectId(createDto.nodeId);
    }
    return this.modelService.create(createData, context);
  }

  @Get()
  @ApiOperation({ summary: 'Get all models with pagination' })
  @ApiReadErrors({ notFound: false })
  async findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser() context: RequestContext
  ) {
    return this.modelService.findAll(query, context);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get model by ID' })
  @ApiReadErrors()
  async findById(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    return this.modelService.findById(new Types.ObjectId(id) as any, context);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a model' })
  @ApiUpdateErrors()
  @RequireUniverseRole()
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateModelDto,
    @CurrentUser() context: RequestContext
  ) {
    return this.modelService.update(new Types.ObjectId(id) as any, updateDto as any, context);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a model (soft delete)' })
  @ApiDeleteErrors()
  async delete(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    return this.modelService.softDelete(new Types.ObjectId(id) as any, context);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a model (change status to active)' })
  @ApiUpdateErrors()
  async activate(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    return this.modelService.activateModel(new Types.ObjectId(id) as any, context);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a model (change status to inactive)' })
  @ApiUpdateErrors()
  async deactivate(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    return this.modelService.deactivateModel(new Types.ObjectId(id) as any, context);
  }
}
