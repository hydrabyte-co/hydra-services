import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BaseController, FindAllQuery, FindManyResult, JwtAuthGuard } from '@hydrabyte/base';
import { OrganizationsService } from './organization.service';
import { Organization } from './organization.schema';
import {
  CreateOrganizationDTO,
  UpdateOrganizationDTO,
} from './organization.dto';

@ApiTags('organizations')
@ApiBearerAuth('JWT-auth')
@Controller('organizations')
export class OrganizationsController extends BaseController<Organization> {
  constructor(private readonly organizationsService: OrganizationsService) {
    super(organizationsService);
  }

  @Post()
  @ApiOperation({ summary: 'Create organization', description: 'Create a new organization' })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @UseGuards(JwtAuthGuard)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      enableDebugMessages: true,
    })
  )
  async create(
    @Body() createDTO: CreateOrganizationDTO,
    @Req() req,
  ): Promise<Partial<Organization>> {
    const context = this.getContext(req);
    return this.organizationsService.create(createDTO, context);
  }

  @Get()
  @ApiOperation({ summary: 'Get all organizations', description: 'Get list of organizations with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Organizations retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async findAll(
    @Query() query: FindAllQuery,
    @Req() req
  ): Promise<FindManyResult<Organization>> {
    return super.findAll(query, req);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID', description: 'Get a single organization by ID' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization found' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Req() req): Promise<Organization | null> {
    return super.findOne(id, req);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update organization', description: 'Update organization information' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization updated successfully' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async update(
    @Param('id') id: string,
    @Body() updateDTO: UpdateOrganizationDTO,
    @Req() req
  ): Promise<Organization | null> {
    return super.update(id, updateDTO, req);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization', description: 'Soft delete an organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization deleted successfully' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Req() req): Promise<Organization | null> {
    return super.delete(id, req);
  }
}
