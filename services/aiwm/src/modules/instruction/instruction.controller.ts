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
import { InstructionService } from './instruction.service';
import { CreateInstructionDto, UpdateInstructionDto } from './instruction.dto';

/**
 * InstructionController
 * Manages instruction entities for AI agent behavior
 * Follows modern controller pattern (no BaseController)
 */
@ApiTags('Instructions')
@ApiBearerAuth()
@Controller('instructions')
@UseGuards(JwtAuthGuard)
export class InstructionController {
  constructor(private readonly instructionService: InstructionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new instruction' })
  @ApiResponse({ status: 201, description: 'Instruction created successfully' })
  @ApiCreateErrors()
  async create(
    @Body() createDto: CreateInstructionDto,
    @CurrentUser() context: RequestContext
  ) {
    return this.instructionService.create(createDto, context);
  }

  @Get()
  @ApiOperation({ summary: 'Get all instructions with pagination' })
  @ApiResponse({ status: 200, description: 'Instructions retrieved successfully' })
  @ApiReadErrors({ notFound: false })
  async findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser() context: RequestContext
  ) {
    return this.instructionService.findAll(query, context);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get instruction by ID' })
  @ApiResponse({ status: 200, description: 'Instruction retrieved successfully' })
  @ApiReadErrors()
  async findById(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    return this.instructionService.findById(new Types.ObjectId(id) as any, context);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an instruction' })
  @ApiResponse({ status: 200, description: 'Instruction updated successfully' })
  @ApiUpdateErrors()
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateInstructionDto,
    @CurrentUser() context: RequestContext
  ) {
    return this.instructionService.update(new Types.ObjectId(id) as any, updateDto, context);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an instruction (soft delete)' })
  @ApiResponse({ status: 200, description: 'Instruction deleted successfully' })
  @ApiDeleteErrors()
  async delete(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    return this.instructionService.softDelete(new Types.ObjectId(id) as any, context);
  }
}
