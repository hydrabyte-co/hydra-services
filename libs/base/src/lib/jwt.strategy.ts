import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt-auth') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Lấy token từ header Authorization: Bearer <token>
      ignoreExpiration: false,
      secretOrKey: process.env['JWT_SECRET'] || 'R4md0m_S3cr3t', // key bí mật
    });

    // Log JWT secret hash for debugging (never log the actual secret)
    const secretHash = require('crypto')
      .createHash('sha256')
      .update(process.env['JWT_SECRET'] || 'R4md0m_S3cr3t')
      .digest('hex')
      .substring(0, 8);
    this.logger.log(`JWT Strategy initialized with secret hash: ${secretHash}...`);
  }

  async validate(payload: any) {
    // Log validation attempt for debugging
    this.logger.debug(`Validating JWT token for user: ${payload.username || payload.sub}`);

    // Validate payload structure
    if (!payload.sub) {
      this.logger.warn('JWT payload missing required field: sub');
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      sub: payload.sub,
      username: payload.username,
      status: payload.status,
      roles: payload.roles || [],
      orgId: payload.orgId || '',
      groupId: payload.groupId || '',
      agentId: payload.agentId || '',
      appId: payload.appId || '',
      userId: payload.userId || '',
      type: payload.type || 'user',
    };
  }
}
