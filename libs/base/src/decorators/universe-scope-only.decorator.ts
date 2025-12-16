import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for UniverseScopeOnly decorator
 */
export const UNIVERSE_SCOPE_ONLY_KEY = 'universeScope:forceUniverseScope';

/**
 * Decorator to mark endpoints that should ignore X-Organization-Id header override
 *
 * When applied to an endpoint:
 * - Universe users: Header is ignored, keeps universe scope (can see all orgs)
 * - Non-universe users: Can still access endpoint (subject to RBAC filtering)
 *
 * Use this when:
 * - Endpoint has its own RBAC logic
 * - Non-universe users should see their own org's data
 * - Universe users should see cross-org data
 *
 * ⚠️ This does NOT restrict access by role
 * For universe-only endpoints, use @RequireUniverseRole() guard instead
 *
 * @example
 * ```typescript
 * @Get('/tools/statistics')
 * @UniverseScopeOnly()
 * @UseGuards(JwtAuthGuard)
 * async getStatistics(@CurrentUser() context: RequestContext) {
 *   // Universe: See all orgs stats (header ignored)
 *   // Org owner: See their org stats (RBAC applies)
 *   return this.service.getStatistics(context);
 * }
 * ```
 *
 * @see RequireUniverseRole For universe-only endpoints
 */
export const UniverseScopeOnly = () => SetMetadata(UNIVERSE_SCOPE_ONLY_KEY, true);
