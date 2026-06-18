import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Protects internal service-to-service endpoints (e.g. the monolith calling
 * strava-service). The caller must send a shared secret in the
 * "x-internal-secret" header that matches INTERNAL_API_SECRET.
 * Fails closed: if the secret is not configured, every request is rejected.
 */
@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-internal-secret'];
    const expected = process.env.INTERNAL_API_SECRET;

    if (!expected || provided !== expected) {
      throw new UnauthorizedException('Invalid internal secret');
    }
    return true;
  }
}
