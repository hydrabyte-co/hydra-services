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
import { GuardrailService } from './guardrail.service';
import { CreateGuardrailDto, UpdateGuardrailDto } from './guardrail.dto';

/**
 * GuardrailController
 * Manages guardrail entities for agent content filtering
 * Follows modern controller pattern (no BaseController)
 */
@ApiTags('Guardrails')
@ApiBearerAuth()
@Controller('guardrails')
@UseGuards(JwtAuthGuard)
export class GuardrailController {
  constructor(private readonly guardrailService: GuardrailService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new guardrail' })
  @ApiResponse({ status: 201, description: 'Guardrail created successfully' })
  @ApiCreateErrors()
  async create(
    @Body() createDto: CreateGuardrailDto,
    @CurrentUser() context: RequestContext
  ) {
    return this.guardrailService.create(createDto, context);
  }

  @Get()
  @ApiOperation({ summary: 'Get all guardrails with pagination' })
  @ApiResponse({ status: 200, description: 'Guardrails retrieved successfully' })
  @ApiReadErrors({ notFound: false })
  async findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser() context: RequestContext
  ) {
    return this.guardrailService.findAll(query, context);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get guardrail by ID' })
  @ApiResponse({ status: 200, description: 'Guardrail retrieved successfully' })
  @ApiReadErrors()
  async findById(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    return this.guardrailService.findById(new Types.ObjectId(id) as any, context);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a guardrail' })
  @ApiResponse({ status: 200, description: 'Guardrail updated successfully' })
  @ApiUpdateErrors()
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateGuardrailDto,
    @CurrentUser() context: RequestContext
  ) {
    return this.guardrailService.update(new Types.ObjectId(id) as any, updateDto, context);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a guardrail (soft delete)' })
  @ApiResponse({ status: 200, description: 'Guardrail deleted successfully' })
  @ApiDeleteErrors()
  async delete(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    return this.guardrailService.softDelete(new Types.ObjectId(id) as any, context);
  }
}
