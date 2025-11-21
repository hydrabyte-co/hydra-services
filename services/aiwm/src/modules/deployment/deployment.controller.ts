import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser, PaginationQueryDto, ApiCreateErrors, ApiReadErrors, ApiUpdateErrors, ApiDeleteErrors } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Types } from 'mongoose';
import { DeploymentService } from './deployment.service';
import { CreateDeploymentDto, UpdateDeploymentDto } from './deployment.dto';

@ApiTags('Deployments')
@ApiBearerAuth()
@Controller('deployments')
@UseGuards(JwtAuthGuard)
export class DeploymentController {
  constructor(private readonly deploymentService: DeploymentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new deployment' })
  @ApiResponse({ status: 201, description: 'Deployment created successfully with status "queued"' })
  @ApiCreateErrors()
  async create(
    @Body() createDto: CreateDeploymentDto,
    @CurrentUser() context: RequestContext,
  ) {
    // Convert string IDs to ObjectIds
    const createData = {
      ...createDto,
      modelId: new Types.ObjectId(createDto.modelId) as any,
      nodeId: new Types.ObjectId(createDto.nodeId) as any,
    };
    return this.deploymentService.create(createData, context);
  }

  @Get()
  @ApiOperation({ summary: 'List all deployments with pagination' })
  @ApiReadErrors({ notFound: false })
  async findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser() context: RequestContext,
  ) {
    return this.deploymentService.findAll(query, context);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deployment by ID' })
  @ApiReadErrors()
  async findById(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    const deployment = await this.deploymentService.findById(new Types.ObjectId(id) as any, context);
    if (!deployment) {
      throw new NotFoundException(`Deployment with ID ${id} not found`);
    }
    return deployment;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update deployment' })
  @ApiResponse({ status: 200, description: 'Deployment updated successfully. Status transitions are validated.' })
  @ApiUpdateErrors()
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDeploymentDto,
    @CurrentUser() context: RequestContext,
  ) {
    const updated = await this.deploymentService.update(new Types.ObjectId(id) as any, updateDto as any, context);
    if (!updated) {
      throw new NotFoundException(`Deployment with ID ${id} not found`);
    }
    return updated;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete deployment' })
  @ApiResponse({ status: 200, description: 'Deployment deleted successfully. Cannot delete running/deploying deployments.' })
  @ApiDeleteErrors()
  async delete(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    return this.deploymentService.softDelete(new Types.ObjectId(id) as any, context);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a deployment' })
  @ApiResponse({ status: 200, description: 'Deployment start initiated. Status changed to "deploying".' })
  @ApiUpdateErrors()
  async start(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    return this.deploymentService.startDeployment(new Types.ObjectId(id) as any, context);
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop a running deployment' })
  @ApiResponse({ status: 200, description: 'Deployment stop initiated. Status changed to "stopping".' })
  @ApiUpdateErrors()
  async stop(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    return this.deploymentService.stopDeployment(new Types.ObjectId(id) as any, context);
  }
}
