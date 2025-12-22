import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser, PaginationQueryDto, ApiCreateErrors, ApiReadErrors, ApiUpdateErrors, ApiDeleteErrors, RequireUniverseRole } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Types } from 'mongoose';
import { NodeService } from './node.service';
import { CreateNodeDto, UpdateNodeDto, GenerateTokenDto, GenerateTokenResponseDto } from './node.dto';

@ApiTags('nodes')
@ApiBearerAuth('JWT-auth')
@Controller('nodes')
export class NodeController {
  constructor(private readonly nodeService: NodeService) {}

  @Post()
  @ApiOperation({ summary: 'Register node', description: 'Register a new GPU node' })
  @ApiResponse({ status: 201, description: 'Node registered successfully' })
  @ApiCreateErrors()
  @UseGuards(JwtAuthGuard)
  @RequireUniverseRole()
  async create(
    @Body() createNodeDto: CreateNodeDto,
    @CurrentUser() context: RequestContext,
  ) {
    return this.nodeService.create(createNodeDto, context);
  }

  @Get()
  @ApiOperation({ summary: 'Get all nodes', description: 'Retrieve list of all GPU nodes with pagination' })
  @ApiResponse({ status: 200, description: 'Nodes retrieved successfully' })
  @ApiReadErrors({ notFound: false })
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @CurrentUser() context: RequestContext,
  ) {
    // Call BaseService.findAll directly
    return this.nodeService.findAll(paginationQuery, context);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get node by ID', description: 'Retrieve a single node by ID' })
  @ApiResponse({ status: 200, description: 'Node found' })
  @ApiReadErrors()
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    // Call BaseService.findById directly
    const node = await this.nodeService.findById(new Types.ObjectId(id) as any, context);
    if (!node) {
      throw new NotFoundException(`Node with ID ${id} not found`);
    }
    return node;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update node', description: 'Update node information' })
  @ApiResponse({ status: 200, description: 'Node updated successfully' })
  @ApiUpdateErrors()
  @UseGuards(JwtAuthGuard)
  @RequireUniverseRole()
  async update(
    @Param('id') id: string,
    @Body() updateNodeDto: UpdateNodeDto,
    @CurrentUser() context: RequestContext,
  ) {
    const updated = await this.nodeService.updateNode(id, updateNodeDto, context);
    if (!updated) {
      throw new NotFoundException(`Node with ID ${id} not found`);
    }
    return updated;
  }

  @Post(':id/token')
  @ApiOperation({
    summary: 'Generate JWT token for node',
    description: 'Generate authentication token and installation script for worker node'
  })
  @ApiResponse({
    status: 200,
    description: 'Token generated successfully',
    type: GenerateTokenResponseDto
  })
  @ApiReadErrors()
  @UseGuards(JwtAuthGuard)
  @RequireUniverseRole()
  async generateToken(
    @Param('id') id: string,
    @Body() body: GenerateTokenDto,
    @CurrentUser() context: RequestContext,
  ) {
    return this.nodeService.generateToken(id, body.expiresIn, context);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete node', description: 'Soft delete a node' })
  @ApiResponse({ status: 200, description: 'Node deleted successfully' })
  @ApiDeleteErrors()
  @UseGuards(JwtAuthGuard)
  @RequireUniverseRole()
  async remove(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    await this.nodeService.remove(id, context);
    return { message: 'Node deleted successfully' };
  }
}
