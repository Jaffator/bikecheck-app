import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { StravaEventsService } from './strava.service';

@Processor('strava-monolith-queue')
export class StravaEventsProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(StravaEventsProcessor.name) private readonly logger: PinoLogger,
    private readonly stravaService: StravaEventsService,
  ) {
    super();
  }

  async process(job: Job): Promise<{ message: string } | void> {
    switch (job.name) {
      case 'strava-authorization':
        await this.stravaService.accountLinked(job.data);
        break;
      case 'strava_activity-created':
      case 'strava_activity-updated': {
        const analyzedData = await this.stravaService.analyzeStravaData(job.data);
        return await this.stravaService.saveAnalyzedData(analyzedData);
      }
      case 'strava_activity-deleted':
        console.log('Strava activity deleted:', job.data);
        await this.stravaService.deleteStravaActivity(job.data);
        break;
      default:
        this.logger.warn({ custom: true, jobName: job.name }, 'Unknown job type');
    }
  }
  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: { message: string } | void): void {
    this.logger.info(
      { custom: true, jobId: job.id, result },
      'Job complete: ' + job.name + ' - ' + (result?.message || 'Job completed'),
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error({ err: error.message, jobId: job.id }, 'Job failed: ' + job.name);
  }
}
