import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GeminiService, GeminiRideSummaryJob } from './gemini.service';

@Processor('gemini-queue')
export class GeminiProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(GeminiProcessor.name) private readonly logger: PinoLogger,
    private readonly geminiService: GeminiService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'generate-ride-summary': {
        await this.geminiService.generateRideSummary(job.data as GeminiRideSummaryJob);
        break;
      }
      default:
        this.logger.warn({ custom: true, jobName: job.name }, 'Unknown job type');
    }
  }
  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.info({ custom: true, jobId: job.id }, 'Job completed: ' + job.name);
  }
  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    const maxAttempts = job.opts.attempts ?? 1;
    const isFinalAttempt = job.attemptsMade >= maxAttempts;

    if (!isFinalAttempt) {
      // Still has retries left -> just a warning, not a failure yet.
      this.logger.warn(
        { custom: true, jobId: job.id, attempt: job.attemptsMade, maxAttempts },
        'Job will retry: ' + job.name,
      );
      return;
    }

    this.logger.error({ err: error.message, jobId: job.id }, 'Job failed: ' + job.name);
  }
}
