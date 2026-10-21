import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Only the monolith may drive this browser. Same header as strava-service, but its own
 * SCRAPER_API_SECRET: the Pi sits at home and should not hold the key to the other services.
 * Fails closed: if the secret is not configured, every request is rejected.
 */
@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-internal-secret'];
    const expected = process.env.SCRAPER_API_SECRET;

    if (!expected || provided !== expected) {
      throw new UnauthorizedException('Invalid internal secret');
    }
    return true;
  }
}
