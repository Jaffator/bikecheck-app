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
      if (config.route) data.route = config.route;
      await this.pushService.sendToUser(notification.user_id, notification.title, notification.body, data);
    }

    // 'inApp' is already delivered (stored in DB); 'email' to be wired later.
    this.logger.info(
      { custom: true, notificationId: notification.id, channels: config.channels },
      'Notification delivery requested: ' + notification.title,
    );
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
