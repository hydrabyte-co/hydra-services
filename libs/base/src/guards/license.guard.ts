import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';
import { LicenseType } from '@hydrabyte/shared';

/**
 * Metadata key for RequireLicense decorator
 */
export const REQUIRE_LICENSE_KEY = 'license:required';

/**
 * Decorator to specify required license type for an endpoint
 *
 * @param licenseType - Minimum required license type (disabled | limited | full)
 *
 * @example
 * ```typescript
 * @Get(':id')
 * @RequireLicense(LicenseType.LIMITED)  // Requires LIMITED or FULL
 * @UseGuards(JwtAuthGuard, LicenseGuard)
 * async findOne(@Param('id') id: string) { }
 *
 * @Post()
 * @RequireLicense(LicenseType.FULL)     // Requires FULL only
 * @UseGuards(JwtAuthGuard, LicenseGuard)
 * async create(@Body() dto: CreateDto) { }
 *
 * @Get()
 * // No decorator = no license check
 * @UseGuards(JwtAuthGuard)
 * async findAll() { }
 * ```
 */
export const RequireLicense = (licenseType: LicenseType) =>
  SetMetadata(REQUIRE_LICENSE_KEY, licenseType);

/**
 * License hierarchy for comparison
 * Higher number = more permissive license
 */
const LICENSE_HIERARCHY: Record<string, number> = {
  [LicenseType.DISABLED]: 0,
  [LicenseType.LIMITED]: 1,
  [LicenseType.FULL]: 2,
};

/**
 * License Guard
 *
 * Enforces license restrictions at the endpoint level using decorator metadata.
 * Operates independently from RBAC and runs AFTER JwtAuthGuard but BEFORE RoleGuard.
 *
 * **How it works:**
 * 1. Reads `@RequireLicense(type)` decorator metadata from the endpoint
 * 2. If no decorator is present → skips check (backwards compatible)
 * 3. Gets current service name from `process.env.SERVICE_NAME`
 * 4. Gets user's license for this service from JWT payload
 * 5. Compares license hierarchy: disabled (0) < limited (1) < full (2)
 * 6. Throws ForbiddenException if user's license is insufficient
 *
 * **Guard Order:**
 * `JwtAuthGuard` → `LicenseGuard` → `RoleGuard`
 *
 * **License Hierarchy:**
 * - `disabled`: Cannot access any decorated endpoints
 * - `limited`: Can access endpoints marked with @RequireLicense(LicenseType.LIMITED)
 * - `full`: Can access all endpoints (limited + full)
 *
 * **Backwards Compatibility:**
 * Endpoints without `@RequireLicense()` decorator are not checked and allow access
 * regardless of license type.
 *
 * @example Guard usage
 * ```typescript
 * @Controller('models')
 * export class ModelController {
 *   @Get()
 *   @UseGuards(JwtAuthGuard)
 *   // No decorator = no license check
 *   async findAll() { }
 *
 *   @Get(':id')
 *   @RequireLicense(LicenseType.LIMITED)
 *   @UseGuards(JwtAuthGuard, LicenseGuard)
 *   async findOne(@Param('id') id: string) { }
 *
 *   @Post()
 *   @RequireLicense(LicenseType.FULL)
 *   @UseGuards(JwtAuthGuard, LicenseGuard)
 *   async create(@Body() dto: CreateModelDto) { }
 * }
 * ```
 */
@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required license from decorator metadata
    const requiredLicense = this.reflector.getAllAndOverride<LicenseType>(
      REQUIRE_LICENSE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no decorator, skip license check (backwards compatible)
    if (!requiredLicense) {
      return true;
    }

    // Get current service name from environment
    const serviceName = process.env.SERVICE_NAME;
    if (!serviceName) {
      console.warn('[LicenseGuard] SERVICE_NAME not set, denying access');
      throw new ForbiddenException(
        'Service configuration error: SERVICE_NAME not set',
      );
    }

    // Get user from request (populated by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Get user's licenses from JWT payload
    const licenses = user.licenses || {};
    const userLicense = licenses[serviceName] || LicenseType.DISABLED;

    // Get hierarchy levels
    const requiredLevel = LICENSE_HIERARCHY[requiredLicense];
    const userLevel = LICENSE_HIERARCHY[userLicense];

    // Check if user has sufficient license
    if (userLevel === undefined || requiredLevel === undefined) {
      console.error('[LicenseGuard] Invalid license type:', {
        requiredLicense,
        userLicense,
        serviceName,
      });
      throw new ForbiddenException('Invalid license configuration');
    }

    if (userLevel < requiredLevel) {
      throw new ForbiddenException(
        `This feature requires ${requiredLicense.toUpperCase()} license for ${serviceName} service. ` +
          `Your organization has ${userLicense.toUpperCase()} license. ` +
          `Please contact your administrator to upgrade your license.`,
      );
    }

    return true;
  }
}
