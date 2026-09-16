import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AccessTokenPayload } from '../entities/auth.interface';

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

  validate(payload: AccessTokenPayload): { userId: number; email: string } {
    // A verification token is signed with the same secret (ADR 0031); its purpose claim is
    // what keeps it from opening a session when pasted where an access token goes.
    if (payload.purpose !== undefined) {
      throw new UnauthorizedException('Not an access token');
    }

    return { userId: payload.sub, email: payload.email };
  }
}
