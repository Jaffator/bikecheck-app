import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PLAN_REMINDER_QUEUE, type PlanReminderJob } from './plan-reminder';
import { ServiceTrackingService } from './service-tracking.service';

@Processor(PLAN_REMINDER_QUEUE)
export class PlanReminderProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(PlanReminderProcessor.name) private readonly logger: PinoLogger,
    private readonly serviceTrackingService: ServiceTrackingService,
  ) {
    super();
  }

  async process(job: Job<PlanReminderJob>): Promise<void> {
    await this.serviceTrackingService.remindPlans(job.data.userId, job.data.day);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error({ err: error.message, jobId: job.id }, 'Job plan reminder failed: ' + job.name);
  }
}
