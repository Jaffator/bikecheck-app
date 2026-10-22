import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { HealthService } from './health.service';

// No auth: Grafana Synthetic Monitoring probes it every minute from outside (docs/deploy.md).
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  async check(): Promise<{ status: 'ok' }> {
    return await this.healthService.check();
  }
}
