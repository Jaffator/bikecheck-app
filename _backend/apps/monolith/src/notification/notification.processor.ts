import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationDeliveryJob } from './notification.service';
import { NOTIFICATION_CONFIG, NotificationType } from './notification-types.config';
import { PushService } from './push.service';

@Processor('notification-queue')
export class NotificationProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(NotificationProcessor.name) private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {
    super();
  }

  async process(job: Job<NotificationDeliveryJob>): Promise<void> {
    const notification = await this.prisma.notifications.findUnique({
      where: { id: job.data.notificationId },
    });
    if (!notification || notification.is_read) return;

    const config = NOTIFICATION_CONFIG[notification.type as NotificationType];

    if (config.channels.includes('push')) {
      const data: Record<string, string> = { type: notification.type };
      // The client navigates to whatever arrives here, so the placeholders have
      // to be filled in before sending — a path with a literal ":bikeId" left in
      // it lands on a broken screen.
      const route = this.buildRoute(config.route, notification.payload);
      if (route) data.route = route;
      await this.pushService.sendToUser(notification.user_id, notification.title, notification.body, data);
    }

    // 'inApp' is already delivered (stored in DB); 'email' to be wired later.
    this.logger.info(
      { custom: true, notificationId: notification.id, channels: config.channels },
      'Notification delivery requested: ' + notification.title,
    );
  }

  // Fills a route template from the notification's payload. Returns null when
  // the type has no route, or when the payload is missing a value the template
  // needs — sending no route is better than sending a broken one.
  private buildRoute(template: string | undefined, payload: unknown): string | null {
    if (!template) return null;

    const values = (payload ?? {}) as Record<string, unknown>;
    const filled = template.replace(/:(\w+)/g, (_match, key: string) => {
      const value = values[key];
      // Only a scalar can stand in for a path segment; anything else would
      // stringify to "[object Object]" and produce a route that resolves
      // to nothing.
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'bigint') return String(value);
      return '';
    });

    return filled.includes('//') || filled.endsWith('/') ? null : filled;
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.info({ custom: true, jobId: job.id }, 'Job Notification completed: ' + job.name);
  }
  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error({ err: error.message, jobId: job.id }, 'Job Notification failed: ' + job.name);
  }
}
