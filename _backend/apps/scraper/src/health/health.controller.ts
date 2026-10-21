import { Controller, Get } from '@nestjs/common';

// No secret: the server's Alloy probes it every minute, and it tells nothing but that the app is up.
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
