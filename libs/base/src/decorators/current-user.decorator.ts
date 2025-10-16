import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestContext } from '@hydrabyte/shared';

/**
 * Extract RequestContext from the authenticated user in the request
 *
 * This decorator extracts the JWT payload from the request and maps it to RequestContext
 * for use with BaseService methods that require permission checking and ownership enforcement.
 *
 * @example
 * ```typescript
 * @Post()
 * @UseGuards(JwtAuthGuard)
 * async create(
 *   @Body() dto: CreateCategoryDto,
 *   @CurrentUser() context: RequestContext
 * ) {
 *   return this.service.create(dto, context);
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestContext => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user; // From JWT strategy

    if (!user) {
      // Return empty context if no user (should not happen with auth guard)
      return {
        userId: '',
        username: '',
        roles: [],
        orgId: '',
        groupId: '',
        agentId: '',
        appId: '',
      } as RequestContext;
    }

    // Map JWT payload to RequestContext
    return {
      userId: user.sub || user.userId || '',
      username: user.username || '',
      roles: user.roles || [],
      orgId: user.orgId || '',
      groupId: user.groupId || '',
      agentId: user.agentId || '',
      appId: user.appId || '',
    } as RequestContext;
  },
);
