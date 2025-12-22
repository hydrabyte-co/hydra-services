import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Metadata key for RequireUniverseRole decorator
 */
export const REQUIRE_UNIVERSE_ROLE_KEY = 'auth:requireUniverseRole';

/**
 * Guard that ensures only users with universe.* roles can access the endpoint
 *
 * This guard:
 * 1. Checks if user has any role starting with "universe."
 * 2. Throws 403 Forbidden if user doesn't have universe role
 * 3. Allows request to proceed if user has universe role
 *
 * @example Usage with guard
 * ```typescript
 * @Get('/organizations')
 * @UseGuards(JwtAuthGuard, UniverseRoleGuard)
 * async findAll(@CurrentUser() context: RequestContext) {
 *   // Only universe.* users can reach here
 * }
 * ```
 */
@Injectable()
export class UniverseRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if endpoint requires universe role
    const requireUniverseRole = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_UNIVERSE_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requireUniverseRole) {
      // Decorator not applied, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check if user has universe role
    const roles = user.roles || [];
    const hasUniverseRole = roles.some((role: string) =>
      String(role).startsWith('universe.'),
    );
    console.log('UniverseRoleGuard - User Roles:', roles, 'Has Universe Role:', hasUniverseRole);
    if (!hasUniverseRole) {
      throw new ForbiddenException(
        'This endpoint requires universe-level permissions. Only system administrators can access this resource.',
      );
    }

    return true;
  }
}

/**
 * Decorator to mark endpoints that require universe.* roles
 *
 * When applied to an endpoint:
 * - Universe users: Can access
 * - Non-universe users: 403 Forbidden
 *
 * Use this for:
 * - System administration endpoints
 * - Cross-organization data access
 * - Sensitive configuration endpoints
 *
 * ⚠️ Must be used with UniverseRoleGuard
 *
 * @example Basic usage
 * ```typescript
 * @Get('/organizations')
 * @RequireUniverseRole()
 * @UseGuards(JwtAuthGuard, UniverseRoleGuard)
 * async findAll(@CurrentUser() context: RequestContext) {
 *   // Only universe.* users can access
 * }
 * ```
 *
 * @example With UniverseScopeOnly
 * ```typescript
 * @Get('/system-settings')
 * @RequireUniverseRole()
 * @UniverseScopeOnly()
 * @UseGuards(JwtAuthGuard, UniverseRoleGuard)
 * async getSettings(@CurrentUser() context: RequestContext) {
 *   // Only universe users + header ignored
 * }
 * ```
 *
 * @see UniverseScopeOnly To ignore X-Organization-Id header
 */
export const RequireUniverseRole = () =>
  SetMetadata(REQUIRE_UNIVERSE_ROLE_KEY, true);
