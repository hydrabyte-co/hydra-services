import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser, PaginationQueryDto, ApiCreateErrors, ApiReadErrors, ApiUpdateErrors, ApiDeleteErrors } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Types } from 'mongoose';
import { AgentService } from './agent.service';
import { CreateAgentDto, UpdateAgentDto } from './agent.dto';

@ApiTags('agents')
@ApiBearerAuth('JWT-auth')
@Controller('agents')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post()
  @ApiOperation({ summary: 'Create agent', description: 'Create a new AI agent' })
  @ApiResponse({ status: 201, description: 'Agent created successfully' })
  @ApiCreateErrors()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createAgentDto: CreateAgentDto,
    @CurrentUser() context: RequestContext,
  ) {
    return this.agentService.create(createAgentDto, context);
  }

  @Get()
  @ApiOperation({ summary: 'Get all agents', description: 'Retrieve list of all agents with pagination' })
  @ApiResponse({ status: 200, description: 'Agents retrieved successfully' })
  @ApiReadErrors({ notFound: false })
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @CurrentUser() context: RequestContext,
  ) {
    return this.agentService.findAll(paginationQuery, context);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent by ID', description: 'Retrieve a single agent by ID' })
  @ApiResponse({ status: 200, description: 'Agent found' })
  @ApiReadErrors()
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    const agent = await this.agentService.findById(new Types.ObjectId(id) as any, context);
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
    return agent;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update agent', description: 'Update agent information' })
  @ApiResponse({ status: 200, description: 'Agent updated successfully' })
  @ApiUpdateErrors()
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
    @CurrentUser() context: RequestContext,
  ) {
    const updated = await this.agentService.updateAgent(id, updateAgentDto, context);
    if (!updated) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
    return updated;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete agent', description: 'Soft delete an agent' })
  @ApiResponse({ status: 200, description: 'Agent deleted successfully' })
  @ApiDeleteErrors()
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    await this.agentService.remove(id, context);
    return { message: 'Agent deleted successfully' };
  }
}