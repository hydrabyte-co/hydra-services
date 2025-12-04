import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseService, FindManyOptions, FindManyResult } from '@hydrabyte/base';
import { RequestContext, ConfigKey } from '@hydrabyte/shared';
import { Configuration } from './configuration.schema';
import {
  CreateConfigurationDto,
  UpdateConfigurationDto,
} from './configuration.dto';
import { CONFIG_METADATA, ConfigKeyMetadata } from './constants';

/**
 * Configuration Service
 *
 * Manages system configuration key-value pairs.
 * V2: Simplified design with strict RBAC (organization.owner only).
 */
@Injectable()
export class ConfigurationService extends BaseService<Configuration> {
  constructor(
    @InjectModel(Configuration.name)
    private readonly configModel: Model<Configuration>
  ) {
    super(configModel as any);
  }

  /**
   * Find all configurations
   * Returns list WITHOUT values (metadata only)
   */
  async findAll(
    options: FindManyOptions,
    context: RequestContext
  ): Promise<FindManyResult<Configuration>> {
    const findResult = await super.findAll(options, context);

    // Aggregate statistics by active status
    const activeStats = await super.aggregate(
      [
        { $match: { ...options.filter } },
        {
          $group: {
            _id: '$isActive',
            count: { $sum: 1 },
          },
        },
      ],
      context
    );

    // Build statistics
    const statistics: any = {
      total: findResult.pagination.total,
      active: 0,
      inactive: 0,
    };

    activeStats.forEach((stat: any) => {
      if (stat._id === true) {
        statistics.active = stat.count;
      } else {
        statistics.inactive = stat.count;
      }
    });

    findResult.statistics = statistics;
    return findResult;
  }

  /**
   * Find configuration by key
   * Returns WITH value
   */
  async findByKey(
    key: ConfigKey,
    context: RequestContext
  ): Promise<Configuration | null> {
    // BaseService.findOne uses RBAC
    const config = await this.configModel
      .findOne({
        key,
        deletedAt: null,
        'owner.orgId': context.orgId,
      })
      .exec();

    if (!config) {
      return null;
    }

    return config;
  }

  /**
   * Create or update configuration
   * Upsert operation: if key exists, update it; otherwise create new
   */
  async createOrUpdate(
    dto: CreateConfigurationDto,
    context: RequestContext
  ): Promise<Configuration> {
    // Validate against metadata
    this.validateConfiguration(dto.key, dto.value);

    // Check if configuration already exists
    const existing = await this.configModel
      .findOne({
        key: dto.key,
        deletedAt: null,
        'owner.orgId': context.orgId,
      })
      .exec();

    if (existing) {
      // Update existing using updateOne
      const updateData: any = {
        value: dto.value,
        updatedBy: context.userId,
        updatedAt: new Date(),
      };
      if (dto.notes !== undefined) {
        updateData.notes = dto.notes;
      }
      if (dto.isActive !== undefined) {
        updateData.isActive = dto.isActive;
      }

      await this.configModel.updateOne(
        { _id: existing._id },
        { $set: updateData }
      );

      this.logger.info('Configuration updated', {
        key: dto.key,
        updatedBy: context.userId,
      });

      // Fetch updated document
      const updated = await this.configModel.findById(existing._id).exec();
      return updated as Configuration;
    } else {
      // Create new
      const created = await super.create(
        {
          ...dto,
          isActive: dto.isActive ?? true,
        } as any,
        context
      );

      this.logger.info('Configuration created', {
        key: dto.key,
        createdBy: context.userId,
      });

      return created as Configuration;
    }
  }

  /**
   * Update configuration by key
   */
  async updateByKey(
    key: ConfigKey,
    dto: UpdateConfigurationDto,
    context: RequestContext
  ): Promise<Configuration> {
    const config = await this.findByKey(key, context);

    if (!config) {
      throw new NotFoundException(
        `Configuration with key '${key}' not found`
      );
    }

    // Build update data
    const updateData: any = {
      updatedBy: context.userId,
      updatedAt: new Date(),
    };

    // Validate value if provided
    if (dto.value !== undefined) {
      this.validateConfiguration(key, dto.value);
      updateData.value = dto.value;
    }

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    // Update using updateOne
    await this.configModel.updateOne(
      { _id: (config as any)._id },
      { $set: updateData }
    );

    this.logger.info('Configuration updated', {
      key,
      updatedBy: context.userId,
    });

    // Fetch updated document
    const updated = await this.configModel.findById((config as any)._id).exec();
    return updated as Configuration;
  }

  /**
   * Delete configuration by key (soft delete)
   */
  async deleteByKey(key: ConfigKey, context: RequestContext): Promise<void> {
    const config = await this.findByKey(key, context);

    if (!config) {
      throw new NotFoundException(
        `Configuration with key '${key}' not found`
      );
    }

    // Soft delete using updateOne
    await this.configModel.updateOne(
      { _id: (config as any)._id },
      {
        $set: {
          deletedAt: new Date(),
          updatedBy: context.userId,
        },
      }
    );

    this.logger.info('Configuration deleted', {
      key,
      deletedBy: context.userId,
    });
  }

  /**
   * Get all configuration metadata
   * Public endpoint - no auth required
   */
  getAllMetadata(): ConfigKeyMetadata[] {
    return Object.values(CONFIG_METADATA);
  }

  /**
   * Get metadata for specific key
   * Public endpoint - no auth required
   */
  getMetadataByKey(key: ConfigKey): ConfigKeyMetadata {
    const metadata = CONFIG_METADATA[key];
    if (!metadata) {
      throw new NotFoundException(`Metadata for key '${key}' not found`);
    }
    return metadata;
  }

  /**
   * Validate configuration value against metadata rules
   */
  private validateConfiguration(key: ConfigKey, value: string): void {
    const metadata = CONFIG_METADATA[key];

    if (!metadata) {
      throw new BadRequestException(`Invalid configuration key: ${key}`);
    }

    // Type validation
    switch (metadata.dataType) {
      case 'number':
        if (isNaN(Number(value))) {
          throw new BadRequestException(
            `Value for '${key}' must be a number`
          );
        }
        if (
          metadata.validation?.min &&
          Number(value) < metadata.validation.min
        ) {
          throw new BadRequestException(
            `Value for '${key}' must be at least ${metadata.validation.min}`
          );
        }
        if (
          metadata.validation?.max &&
          Number(value) > metadata.validation.max
        ) {
          throw new BadRequestException(
            `Value for '${key}' must be at most ${metadata.validation.max}`
          );
        }
        break;

      case 'boolean':
        if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
          throw new BadRequestException(
            `Value for '${key}' must be true/false or 1/0`
          );
        }
        break;

      case 'url':
        try {
          new URL(value);
        } catch {
          throw new BadRequestException(
            `Value for '${key}' must be a valid URL`
          );
        }
        break;

      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          throw new BadRequestException(
            `Value for '${key}' must be a valid email`
          );
        }
        break;
    }

    // Pattern validation
    if (metadata.validation?.pattern) {
      const regex = new RegExp(metadata.validation.pattern);
      if (!regex.test(value)) {
        throw new BadRequestException(
          `Value for '${key}' does not match required pattern`
        );
      }
    }

    // Length validation
    if (
      metadata.validation?.minLength &&
      value.length < metadata.validation.minLength
    ) {
      throw new BadRequestException(
        `Value for '${key}' must be at least ${metadata.validation.minLength} characters`
      );
    }

    if (
      metadata.validation?.maxLength &&
      value.length > metadata.validation.maxLength
    ) {
      throw new BadRequestException(
        `Value for '${key}' must be at most ${metadata.validation.maxLength} characters`
      );
    }

    // Enum validation
    if (
      metadata.validation?.enum &&
      !metadata.validation.enum.includes(value)
    ) {
      throw new BadRequestException(
        `Value for '${key}' must be one of: ${metadata.validation.enum.join(', ')}`
      );
    }
  }
}
