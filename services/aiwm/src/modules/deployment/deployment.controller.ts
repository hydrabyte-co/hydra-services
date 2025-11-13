import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser, PaginationQueryDto, ApiCreateErrors, ApiReadErrors, ApiUpdateErrors, ApiDeleteErrors } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Types } from 'mongoose';
import { DeploymentService } from './deployment.service';
import { CreateDeploymentDto, UpdateDeploymentDto } from './deployment.dto';

@ApiTags('deployments')
@ApiBearerAuth('JWT-auth')
@Controller('deployments')
export class DeploymentController {
  constructor(private readonly deploymentService: DeploymentService) {}

  @Post()
  @ApiOperation({ summary: 'Create deployment', description: 'Create a new model deployment' })
  @ApiResponse({ status: 201, description: 'Deployment created successfully' })
  @ApiCreateErrors()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createDeploymentDto: CreateDeploymentDto,
    @CurrentUser() context: RequestContext,
  ) {
    return this.deploymentService.create(createDeploymentDto, context);
  }

  @Get()
  @ApiOperation({ summary: 'Get all deployments', description: 'Retrieve list of all deployments with pagination' })
  @ApiResponse({ status: 200, description: 'Deployments retrieved successfully' })
  @ApiReadErrors({ notFound: false })
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @CurrentUser() context: RequestContext,
  ) {
    // Call BaseService.findAll directly
    return this.deploymentService.findAll(paginationQuery, context);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deployment by ID', description: 'Retrieve a single deployment by ID' })
  @ApiResponse({ status: 200, description: 'Deployment found' })
  @ApiReadErrors()
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    // Call BaseService.findById directly
    const deployment = await this.deploymentService.findById(new Types.ObjectId(id) as any, context);
    if (!deployment) {
      throw new NotFoundException(`Deployment with ID ${id} not found`);
    }
    return deployment;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update deployment', description: 'Update deployment information' })
  @ApiResponse({ status: 200, description: 'Deployment updated successfully' })
  @ApiUpdateErrors()
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateDeploymentDto: UpdateDeploymentDto,
    @CurrentUser() context: RequestContext,
  ) {
    const updated = await this.deploymentService.updateDeployment(id, updateDeploymentDto, context);
    if (!updated) {
      throw new NotFoundException(`Deployment with ID ${id} not found`);
    }
    return updated;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete deployment', description: 'Soft delete a deployment' })
  @ApiResponse({ status: 200, description: 'Deployment deleted successfully' })
  @ApiDeleteErrors()
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    await this.deploymentService.remove(id, context);
    return { message: 'Deployment deleted successfully' };
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start deployment', description: 'Start a running deployment' })
  @ApiResponse({ status: 200, description: 'Deployment started successfully' })
  @ApiUpdateErrors()
  @UseGuards(JwtAuthGuard)
  async start(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    const deployment = await this.deploymentService.startDeployment(id, context);
    return {
      message: 'Deployment started successfully',
      deployment: deployment
    };
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop deployment', description: 'Stop a running deployment' })
  @ApiResponse({ status: 200, description: 'Deployment stopped successfully' })
  @ApiUpdateErrors()
  @UseGuards(JwtAuthGuard)
  async stop(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    const deployment = await this.deploymentService.stopDeployment(id, context);
    return {
      message: 'Deployment stopped successfully',
      deployment: deployment
    };
  }
}