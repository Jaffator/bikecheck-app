import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not defined');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.access_token ?? null, // 1. try cookie (browser/frontend)
        ExtractJwt.fromAuthHeaderAsBearerToken(), // 2. fallback on Bearer header (Postman)
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  validate(payload: any) {
    return { userId: payload.sub, email: payload.email };
  }
}
