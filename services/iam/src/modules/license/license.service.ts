import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseService, FindManyOptions, FindManyResult } from '@hydrabyte/base';
import { RequestContext, ServiceName, LicenseType } from '@hydrabyte/shared';
import { License } from './license.schema';
import { Organization } from '../organization/organization.schema';
import {
  CreateLicenseDto,
  UpdateLicenseDto,
  CreateDefaultLicensesDto,
} from './license.dto';

/**
 * Service for managing organization licenses
 *
 * With flat schema, each license record represents one org-service pair.
 * This service handles:
 * - CRUD operations for individual licenses
 * - Organization existence validation
 * - Bulk operations for creating default licenses
 * - License lookup and aggregation for JWT payload
 */
@Injectable()
export class LicenseService extends BaseService<License> {
  constructor(
    @InjectModel(License.name) private readonly licenseModel: Model<License>,
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<Organization>
  ) {
    super(licenseModel);
  }

  /**
   * Validate that an organization exists and is not deleted
   * @throws NotFoundException if organization doesn't exist
   */
  private async validateOrganizationExists(orgId: string): Promise<void> {
    // Validate MongoDB ObjectId format
    if (!Types.ObjectId.isValid(orgId)) {
      throw new BadRequestException(
        `Invalid orgId format: ${orgId}. Must be a valid MongoDB ObjectId.`
      );
    }

    // Check if organization exists
    const org = await this.organizationModel.findOne({
      _id: orgId,
      isDeleted: false,
    });

    if (!org) {
      throw new NotFoundException(
        `Organization with ID ${orgId} not found or has been deleted`
      );
    }
  }

  /**
   * Create a single license record for an organization-service pair
   * Only universe.owner can create licenses (enforced by BaseService RBAC)
   *
   * @throws ConflictException if license already exists for the org-service pair
   * @throws NotFoundException if organization doesn't exist
   */
  async createLicense(
    dto: CreateLicenseDto,
    context: RequestContext
  ): Promise<License> {
    // Validate organization exists
    await this.validateOrganizationExists(dto.orgId);

    // Check if license already exists for this org-service pair
    const existing = await this.licenseModel.findOne({
      orgId: dto.orgId,
      serviceName: dto.serviceName,
      isDeleted: false,
    });

    if (existing) {
      throw new ConflictException(
        `License already exists for organization ${dto.orgId} and service ${dto.serviceName}`
      );
    }

    // Create license record
    const license = await this.create(dto as any, context);

    return license as License;
  }

  /**
   * Override findAll to add statistics by type and serviceName
   */
  async findAll(
    options: FindManyOptions,
    context: RequestContext
  ): Promise<FindManyResult<License>> {
    const findResult = await super.findAll(options, context);

    // Aggregate statistics by license type
    const typeStats = await super.aggregate(
      [
        { $match: { ...options.filter, isDeleted: false } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
      ],
      context
    );

    // Aggregate statistics by service name
    const serviceStats = await super.aggregate(
      [
        { $match: { ...options.filter, isDeleted: false } },
        {
          $group: {
            _id: '$serviceName',
            count: { $sum: 1 },
          },
        },
      ],
      context
    );

    // Build statistics object
    const statistics: any = {
      total: findResult.pagination.total,
      byType: {},
      byService: {},
    };

    // Map type statistics
    typeStats.forEach((stat: any) => {
      statistics.byType[stat._id] = stat.count;
    });

    // Map service statistics
    serviceStats.forEach((stat: any) => {
      statistics.byService[stat._id] = stat.count;
    });

    findResult.statistics = statistics;
    return findResult;
  }

  /**
   * Get all licenses for an organization
   * Returns array of license records (one per service)
   *
   * @param orgId - MongoDB ObjectId of the organization
   * @returns Array of license records
   */
  async getLicensesByOrgId(orgId: string): Promise<License[]> {
    const licenses = await this.licenseModel.find({
      orgId,
      isDeleted: false,
    });

    return licenses;
  }

  /**
   * Get a specific license for an organization-service pair
   *
   * @param orgId - MongoDB ObjectId of the organization
   * @param serviceName - Service name (iam, cbm, aiwm, noti)
   * @returns License record or null if not found
   */
  async getLicenseByOrgAndService(
    orgId: string,
    serviceName: ServiceName
  ): Promise<License | null> {
    const license = await this.licenseModel.findOne({
      orgId,
      serviceName,
      isDeleted: false,
    });

    return license;
  }

  /**
   * Update a specific license
   * Only universe.owner can update (enforced by BaseService RBAC)
   *
   * @param id - License document ID
   * @param dto - License updates
   * @param context - Request context for RBAC
   * @throws NotFoundException if license doesn't exist
   */
  async updateLicense(
    id: string,
    dto: UpdateLicenseDto,
    context: RequestContext
  ): Promise<License> {
    const objectId = new Types.ObjectId(id) as any;
    const updated = await this.update(objectId, dto as any, context);

    if (!updated) {
      throw new NotFoundException(`License with ID ${id} not found`);
    }

    return updated as License;
  }

  /**
   * Delete a license (soft delete)
   *
   * @param id - License document ID
   * @param context - Request context for RBAC
   * @throws NotFoundException if license doesn't exist
   */
  async deleteLicense(
    id: string,
    context: RequestContext
  ): Promise<License> {
    const objectId = new Types.ObjectId(id) as any;
    return this.softDelete(objectId, context) as any;
  }

  /**
   * Create default licenses for a new organization
   * Creates one license record per service
   *
   * Default licenses:
   * - IAM: FULL (required for authentication and user management)
   * - All other services: DISABLED
   *
   * @param dto - Organization ID and optional notes
   * @param context - Request context (typically from org creator)
   * @returns Array of created license records
   * @throws NotFoundException if organization doesn't exist
   */
  async createDefaultLicenses(
    dto: CreateDefaultLicensesDto,
    context: RequestContext
  ): Promise<License[]> {
    const { orgId, notes } = dto;

    // Validate organization exists
    await this.validateOrganizationExists(orgId);

    // Define default licenses for all services
    const defaultLicenses: CreateLicenseDto[] = [
      {
        orgId,
        serviceName: ServiceName.IAM,
        type: LicenseType.FULL,
        notes: notes || 'Default license - IAM full access',
      },
      {
        orgId,
        serviceName: ServiceName.CBM,
        type: LicenseType.DISABLED,
        notes: notes || 'Default license - disabled',
      },
      {
        orgId,
        serviceName: ServiceName.NOTI,
        type: LicenseType.DISABLED,
        notes: notes || 'Default license - disabled',
      },
      {
        orgId,
        serviceName: ServiceName.AIWM,
        type: LicenseType.DISABLED,
        notes: notes || 'Default license - disabled',
      },
    ];

    // Create all licenses
    const createdLicenses: License[] = [];
    for (const licenseDto of defaultLicenses) {
      try {
        const license = await this.createLicense(licenseDto, context);
        createdLicenses.push(license);
      } catch (error) {
        // Log error but continue creating other licenses
        console.error(
          `Failed to create license for ${licenseDto.serviceName}:`,
          error.message
        );
      }
    }

    return createdLicenses;
  }

  /**
   * Build licenses map for JWT payload
   * Converts array of License records to simple { service: licenseType } map
   *
   * Used during login and token refresh to embed licenses in JWT.
   * Returns default licenses for services without records.
   *
   * @param orgId - MongoDB ObjectId of the organization
   * @returns Simple map of service names to license types (strings)
   *
   * @example
   * // Returns:
   * {
   *   iam: 'full',
   *   aiwm: 'limited',
   *   cbm: 'disabled',
   *   noti: 'disabled'
   * }
   */
  async getLicensesForJWT(orgId: string): Promise<Record<string, string>> {
    const licenses = await this.getLicensesByOrgId(orgId);

    // Convert array to map
    const licensesMap: Record<string, string> = {};
    licenses.forEach((license) => {
      licensesMap[license.serviceName] = license.type;
    });

    // Ensure all services have a license type (default to disabled if not found)
    Object.values(ServiceName).forEach((service) => {
      if (!licensesMap[service]) {
        licensesMap[service] =
          service === ServiceName.IAM
            ? LicenseType.FULL // IAM defaults to FULL if not found
            : LicenseType.DISABLED; // Others default to DISABLED
      }
    });

    return licensesMap;
  }

  /**
   * Get licenses with grouping/statistics
   * Useful for admin dashboards
   *
   * @param orgId - Optional organization filter
   * @returns Aggregated license data
   */
  async getLicenseStatistics(orgId?: string) {
    const filter: any = { isDeleted: false };
    if (orgId) {
      filter.orgId = orgId;
    }

    const stats = await this.licenseModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            service: '$serviceName',
            type: '$type',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.service',
          types: {
            $push: {
              type: '$_id.type',
              count: '$count',
            },
          },
          total: { $sum: '$count' },
        },
      },
    ]);

    return stats;
  }
}
