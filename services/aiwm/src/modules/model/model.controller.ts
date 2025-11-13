import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser, PaginationQueryDto, ApiCreateErrors, ApiReadErrors, ApiUpdateErrors, ApiDeleteErrors } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Types } from 'mongoose';
import { ModelService } from './model.service';
import { CreateModelDto, UpdateModelDto } from './model.dto';

@ApiTags('models')
@ApiBearerAuth('JWT-auth')
@Controller('models')
export class ModelController {
  constructor(private readonly modelService: ModelService) {}

  @Post()
  @ApiOperation({ summary: 'Register model', description: 'Register a new model in the registry' })
  @ApiResponse({ status: 201, description: 'Model registered successfully' })
  @ApiCreateErrors()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createModelDto: CreateModelDto,
    @CurrentUser() context: RequestContext,
  ) {
    return this.modelService.create(createModelDto, context);
  }

  @Get()
  @ApiOperation({ summary: 'Get all models', description: 'Retrieve list of all models with pagination' })
  @ApiResponse({ status: 200, description: 'Models retrieved successfully' })
  @ApiReadErrors({ notFound: false })
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @CurrentUser() context: RequestContext,
  ) {
    // Call BaseService.findAll directly
    return this.modelService.findAll(paginationQuery, context);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get model by ID', description: 'Retrieve a single model by ID' })
  @ApiResponse({ status: 200, description: 'Model found' })
  @ApiReadErrors()
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    // Call BaseService.findById directly
    const model = await this.modelService.findById(new Types.ObjectId(id) as any, context);
    if (!model) {
      throw new NotFoundException(`Model with ID ${id} not found`);
    }
    return model;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update model', description: 'Update model information' })
  @ApiResponse({ status: 200, description: 'Model updated successfully' })
  @ApiUpdateErrors()
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateModelDto: UpdateModelDto,
    @CurrentUser() context: RequestContext,
  ) {
    const updated = await this.modelService.updateModel(id, updateModelDto, context);
    if (!updated) {
      throw new NotFoundException(`Model with ID ${id} not found`);
    }
    return updated;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete model', description: 'Soft delete a model' })
  @ApiResponse({ status: 200, description: 'Model deleted successfully' })
  @ApiDeleteErrors()
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    await this.modelService.remove(id, context);
    return { message: 'Model deleted successfully' };
  }
}