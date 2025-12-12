import {
  Controller,
  Get,
  Post,
  Patch,
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
} from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Types } from 'mongoose';
import { WorkService } from './work.service';
import { CreateWorkDto, UpdateWorkDto } from './work.dto';

@ApiTags('Works')
@ApiBearerAuth()
@Controller('works')
export class WorkController {
  constructor(private readonly workService: WorkService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new work' })
  @ApiCreateErrors()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createWorkDto: CreateWorkDto,
    @CurrentUser() context: RequestContext
  ) {
    return this.workService.create(createWorkDto, context);
  }

  @Get()
  @ApiOperation({ summary: 'List all works with pagination and statistics' })
  @ApiReadErrors({ notFound: false })
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser() context: RequestContext
  ) {
    return this.workService.findAll(query, context);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get work by ID' })
  @ApiReadErrors()
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    return this.workService.findById(new Types.ObjectId(id) as any, context);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update work by ID' })
  @ApiUpdateErrors()
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateWorkDto: UpdateWorkDto,
    @CurrentUser() context: RequestContext
  ) {
    return this.workService.update(new Types.ObjectId(id) as any, updateWorkDto as any, context);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete work by ID (only done/cancelled)' })
  @ApiDeleteErrors()
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    return this.workService.softDelete(new Types.ObjectId(id) as any, context);
  }

  // =============== Action Endpoints ===============

  @Post(':id/start')
  @ApiOperation({
    summary: 'Start work',
    description: 'Transition work from todo to in_progress status'
  })
  @ApiUpdateErrors()
  @UseGuards(JwtAuthGuard)
  async start(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    return this.workService.startWork(new Types.ObjectId(id) as any, context);
  }

  @Post(':id/block')
  @ApiOperation({
    summary: 'Block work',
    description: 'Transition work from in_progress to blocked status'
  })
  @ApiUpdateErrors()
  @UseGuards(JwtAuthGuard)
  async block(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    return this.workService.blockWork(new Types.ObjectId(id) as any, context);
  }

  @Post(':id/unblock')
  @ApiOperation({
    summary: 'Unblock work',
    description: 'Transition work from blocked to in_progress status'
  })
  @ApiUpdateErrors()
  @UseGuards(JwtAuthGuard)
  async unblock(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    return this.workService.unblockWork(new Types.ObjectId(id) as any, context);
  }

  @Post(':id/request-review')
  @ApiOperation({
    summary: 'Request review',
    description: 'Transition work from in_progress to review status'
  })
  @ApiUpdateErrors()
  @UseGuards(JwtAuthGuard)
  async requestReview(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    return this.workService.requestReview(new Types.ObjectId(id) as any, context);
  }

  @Post(':id/complete')
  @ApiOperation({
    summary: 'Complete work',
    description: 'Transition work from review to done status'
  })
  @ApiUpdateErrors()
  @UseGuards(JwtAuthGuard)
  async complete(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    return this.workService.completeWork(new Types.ObjectId(id) as any, context);
  }

  @Post(':id/reopen')
  @ApiOperation({
    summary: 'Reopen work',
    description: 'Transition work from done to in_progress status'
  })
  @ApiUpdateErrors()
  @UseGuards(JwtAuthGuard)
  async reopen(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    return this.workService.reopenWork(new Types.ObjectId(id) as any, context);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel work',
    description: 'Transition work from any status to cancelled'
  })
  @ApiUpdateErrors()
  @UseGuards(JwtAuthGuard)
  async cancel(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    return this.workService.cancelWork(new Types.ObjectId(id) as any, context);
  }

  @Get(':id/can-trigger')
  @ApiOperation({
    summary: 'Check if work can trigger agent execution',
    description: 'Validates if work meets all conditions to trigger agent: assigned to agent, startAt time reached, status ready, not blocked'
  })
  @ApiReadErrors()
  @UseGuards(JwtAuthGuard)
  async canTrigger(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    return this.workService.canTriggerAgent(new Types.ObjectId(id) as any, context);
  }
}
