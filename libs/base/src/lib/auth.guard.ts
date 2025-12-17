import { Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-auth') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // Log guard activation
    console.log(`[JwtAuthGuard] canActivate called for ${request.method} ${request.url}`);
    console.log(`[JwtAuthGuard] Authorization header: ${authHeader ? authHeader.substring(0, 30) + '...' : 'MISSING'}`);
    this.logger.debug(`canActivate called for ${request.method} ${request.url}`);
    this.logger.debug(`Authorization header: ${authHeader ? 'Present' : 'MISSING'}`);

    const isPublic = this.reflector.getAllAndOverride<boolean>('public', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      console.log('[JwtAuthGuard] Route is public, bypassing authentication');
      this.logger.debug('Route is public, bypassing authentication');
      return true;
    }

    console.log('[JwtAuthGuard] Calling super.canActivate() to trigger JwtStrategy');
    this.logger.debug('Calling super.canActivate() to trigger JwtStrategy');

    return super.canActivate(context);
  }

  override handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    console.log('[JwtAuthGuard] handleRequest called');
    console.log(`[JwtAuthGuard] Error: ${err ? err.message : 'none'}`);
    console.log(`[JwtAuthGuard] User: ${user ? JSON.stringify(user).substring(0, 100) : 'null'}`);
    console.log(`[JwtAuthGuard] Info: ${info ? JSON.stringify(info) : 'none'}`);

    this.logger.debug('handleRequest called');
    this.logger.debug(`Error: ${err ? err.message : 'none'}`);
    this.logger.debug(`User: ${user ? 'present' : 'null'}`);
    this.logger.debug(`Info: ${info ? JSON.stringify(info) : 'none'}`);

    return super.handleRequest(err, user, info, context);
  }
}

