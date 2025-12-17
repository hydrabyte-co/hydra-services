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
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {
  JwtAuthGuard,
  CurrentUser,
  PaginationQueryDto,
  ApiCreateErrors,
  ApiReadErrors,
  ApiUpdateErrors,
  RequireUniverseRole,
  UniverseRoleGuard,
  UniverseScopeOnly,
} from '@hydrabyte/base';
import { RequestContext, ServiceName } from '@hydrabyte/shared';
import { LicenseService } from './license.service';
import {
  CreateLicenseDto,
  UpdateLicenseDto,
  CreateDefaultLicensesDto,
} from './license.dto';

/**
 * License Controller
 *
 * Manages organization licenses with flat RESTful API design.
 * Each license record represents one organization-service pair.
 *
 * All operations require universe.owner role.
 */
@ApiTags('licenses')
@ApiBearerAuth('JWT-auth')
@Controller('licenses')
@RequireUniverseRole()
@UniverseScopeOnly()
@UseGuards(JwtAuthGuard, UniverseRoleGuard)
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  /**
   * Create a new license record
   * Creates one license for one organization-service pair
   */
  @Post()
  @ApiOperation({
    summary: 'Create license',
    description:
      'Create a license for an organization-service pair (universe.owner only)',
  })
  @ApiResponse({ status: 201, description: 'License created successfully' })
  @ApiCreateErrors()
  async create(
    @Body() createDto: CreateLicenseDto,
    @CurrentUser() context: RequestContext
  ) {
    return this.licenseService.createLicense(createDto, context);
  }

  /**
   * Create default licenses for an organization
   * Bulk operation to create licenses for all services at once
   */
  @Post('default')
  @ApiOperation({
    summary: 'Create default licenses',
    description:
      'Create default licenses for all services in an organization (universe.owner only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Default licenses created successfully',
  })
  @ApiCreateErrors()
  async createDefault(
    @Body() dto: CreateDefaultLicensesDto,
    @CurrentUser() context: RequestContext
  ) {
    return this.licenseService.createDefaultLicenses(dto, context);
  }

  /**
   * List all licenses with filtering and pagination
   * Supports filtering by orgId and serviceName
   */
  @Get()
  @ApiOperation({
    summary: 'List all licenses',
    description:
      'Retrieve all licenses with pagination and optional filters (universe.owner only)',
  })
  @ApiQuery({
    name: 'orgId',
    required: false,
    description: 'Filter by organization ID',
  })
  @ApiQuery({
    name: 'serviceName',
    required: false,
    enum: ServiceName,
    description: 'Filter by service name',
  })
  @ApiResponse({ status: 200, description: 'Licenses retrieved successfully' })
  @ApiReadErrors({ notFound: false })
  async findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @Query('orgId') orgId?: string,
    @Query('serviceName') serviceName?: ServiceName,
    @CurrentUser() context?: RequestContext
  ) {
    // Build filter from query params
    const filter: any = {};
    if (orgId) {
      filter.orgId = orgId;
    }
    if (serviceName) {
      filter.serviceName = serviceName;
    }

    // Merge filter with pagination options
    const options = {
      ...paginationQuery,
      filter: { ...paginationQuery.filter, ...filter },
    };

    return this.licenseService.findAll(options, context);
  }

  /**
   * Get a specific license by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get license by ID',
    description: 'Retrieve a specific license record (universe.owner only)',
  })
  @ApiParam({ name: 'id', description: 'License ID (MongoDB ObjectId)' })
  @ApiResponse({ status: 200, description: 'License found' })
  @ApiReadErrors()
  async findOne(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext
  ) {
    const objectId = new Types.ObjectId(id) as any;
    const license = await this.licenseService.findById(objectId, context);
    if (!license) {
      throw new NotFoundException(`License with ID ${id} not found`);
    }
    return license;
  }

  /**
   * Update a license by ID
   * Partial update - only provided fields are updated
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update license',
    description:
      'Update a license record by ID (universe.owner only). Cannot change orgId or serviceName.',
  })
  @ApiParam({ name: 'id', description: 'License ID (MongoDB ObjectId)' })
  @ApiResponse({ status: 200, description: 'License updated successfully' })
  @ApiUpdateErrors()
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateLicenseDto,
    @CurrentUser() context: RequestContext
  ) {
    return this.licenseService.updateLicense(id, updateDto, context);
  }

  /**
   * Delete a license by ID (soft delete)
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete license',
    description: 'Soft delete a license record by ID (universe.owner only)',
  })
  @ApiParam({ name: 'id', description: 'License ID (MongoDB ObjectId)' })
  @ApiResponse({ status: 200, description: 'License deleted successfully' })
  @ApiUpdateErrors()
  async remove(@Param('id') id: string, @CurrentUser() context: RequestContext) {
    return this.licenseService.deleteLicense(id, context);
  }

  /**
   * Get license statistics
   * Aggregated data grouped by service and type
   */
  @Get('statistics/summary')
  @ApiOperation({
    summary: 'Get license statistics',
    description:
      'Retrieve aggregated license statistics by service and type (universe.owner only)',
  })
  @ApiQuery({
    name: 'orgId',
    required: false,
    description: 'Filter statistics by organization ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics(@Query('orgId') orgId?: string) {
    return this.licenseService.getLicenseStatistics(orgId);
  }
}
