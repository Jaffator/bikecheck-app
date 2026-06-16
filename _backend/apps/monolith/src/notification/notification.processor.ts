import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationDeliveryJob } from './notification.service';
import { NOTIFICATION_CONFIG, NotificationType } from './notification-types.config';

@Processor('notification-queue')
export class NotificationProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(NotificationProcessor.name) private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<NotificationDeliveryJob>): Promise<void> {
    const notification = await this.prisma.notifications.findUnique({
      where: { id: job.data.notificationId },
    });
    if (!notification || notification.is_read) return;

    const config = NOTIFICATION_CONFIG[notification.type as NotificationType];

    // TODO: wire real push/email providers once chosen; for now only in-app (stored in DB) is delivered.
    this.logger.info(
      { custom: true, notificationId: notification.id, channels: config.channels },
      'Notification delivery requested: ' + notification.title,
    );
  }
}
