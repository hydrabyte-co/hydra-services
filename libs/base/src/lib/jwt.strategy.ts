import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Lấy token từ header Authorization: Bearer <token>
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'r4md0m_s3cr3t', // key bí mật
    });
  }

  async validate(payload: any) {
    // payload chính là data trong JWT (ví dụ: { sub: userId, username: 'abc' })
    return { userId: payload.sub, username: payload.username };
  }
}
