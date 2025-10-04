import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt-auth') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Lấy token từ header Authorization: Bearer <token>
      ignoreExpiration: false,
      secretOrKey: process.env['JWT_SECRET'] || 'R4md0m_S3cr3t', // key bí mật
    });
  }

  async validate(payload: any) {
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
