import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { StravaEventsService } from './strava.service';

@Processor('strava-events-queue')
export class StravaEventsProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(StravaEventsProcessor.name) private readonly logger: PinoLogger,
    private readonly stravaEventsService: StravaEventsService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'strava_activity-created') {
      console.log('Processing job:', job.name);
      await this.stravaEventsService.anaylyzeStravaData(job.data);
    }
    if (job.name === 'strava_activity-updated') {
      await this.stravaEventsService.activityUpdated(job.data);
    }
    if (job.name === 'strava_activity-deleted') {
      await this.stravaEventsService.activityDeleted(job.data);
    }
  }
}
