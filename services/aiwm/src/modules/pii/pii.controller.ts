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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
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
import { PiiService } from './pii.service';
import { CreatePiiDto, UpdatePiiDto } from './pii.dto';

/**
 * PiiController
 * Manages PII pattern entities for data protection
 * Follows modern controller pattern (no BaseController)
 */
@ApiTags('PII Patterns')
@ApiBearerAuth()
@Controller('pii-patterns')
@UseGuards(JwtAuthGuard)
export class PiiController {
  constructor(private readonly piiService: PiiService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new PII pattern' })
  @ApiResponse({ status: 201, description: 'PII pattern created successfully' })
  @ApiCreateErrors()
  async create(
    @Body() createDto: CreatePiiDto,
    @CurrentUser() context: RequestContext
  ) {
    return this.piiService.create(createDto, context);
  }

  @Get()
  @ApiOperation({ summary: 'Get all PII patterns with pagination' })
  @ApiResponse({ status: 200, description: 'PII patterns retrieved successfully' })
  @ApiReadErrors({ notFound: false })
  async findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser() context: RequestContext
  ) {
    return this.piiService.findAll(query, context);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active and enabled PII patterns' })
  @ApiResponse({ status: 200, description: 'Active PII patterns retrieved successfully' })
  @ApiReadErrors({ notFound: false })
  async getActivePatterns(@CurrentUser() context: RequestContext) {
    return this.piiService.getActivePatterns(context);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get PII pattern by ID' })
  @ApiResponse({ status: 200, description: 'PII pattern retrieved successfully' })
  @ApiReadErrors()
  async findById(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    return this.piiService.findById(new Types.ObjectId(id) as any, context);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a PII pattern' })
  @ApiResponse({ status: 200, description: 'PII pattern updated successfully' })
  @ApiUpdateErrors()
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePiiDto,
    @CurrentUser() context: RequestContext
  ) {
    return this.piiService.update(new Types.ObjectId(id) as any, updateDto, context);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a PII pattern (soft delete)' })
  @ApiResponse({ status: 200, description: 'PII pattern deleted successfully' })
  @ApiDeleteErrors()
  async delete(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    return this.piiService.softDelete(new Types.ObjectId(id) as any, context);
  }
}
