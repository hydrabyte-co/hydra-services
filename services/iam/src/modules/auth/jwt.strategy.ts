import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenStorageService } from './token-storage.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt-auth') {
  constructor(private readonly tokenStorage: TokenStorageService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env['JWT_SECRET'] || 'R4md0m_S3cr3t',
      passReqToCallback: true, // Enable access to request object
    });
  }

  async validate(req: any, payload: any) {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    // Check if token is blacklisted
    if (token && this.tokenStorage.isTokenBlacklisted(token)) {
      throw new UnauthorizedException('Token has been revoked');
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
    };
  }
}
