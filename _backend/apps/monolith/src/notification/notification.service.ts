import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq/dist/decorators/inject-queue.decorator';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from './notification-types.config';
import { buildNotificationText, NotificationTextPayload } from './notification-texts';
import { notifications, Prisma } from '@prisma/client';
import { DeviceTokenDto } from './dto/device-token-.dto';

export interface NotificationDeliveryJob {
  notificationId: number;
}

export interface CreateNotificationParams {
  userId: number;
  type: NotificationType;
  // Fills in both the stored text and the route the client navigates to, so a
  // caller never writes a sentence — only the facts one is built from.
  payload?: NotificationTextPayload & Prisma.InputJsonObject;
  dedupKey?: string;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue('notification-queue') private readonly notificationQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async registerFcmToken(userId: number, deviceTokenDto: DeviceTokenDto): Promise<void> {
    await this.prisma.device_tokens.upsert({
      where: { user_id_token: { user_id: userId, token: deviceTokenDto.token } },
      update: { platform: deviceTokenDto.platform },
      create: { user_id: userId, token: deviceTokenDto.token, platform: deviceTokenDto.platform },
    });
  }

  async create(params: CreateNotificationParams): Promise<void> {
    if (params.dedupKey) {
      const existing = await this.prisma.notifications.findUnique({
        where: { user_id_dedup_key: { user_id: params.userId, dedup_key: params.dedupKey } },
      });
      if (existing) return;
    }

    // The text is written in the user's language now, because a push is
    // rendered by the OS with the app closed — there is no client left to
    // translate it at display time.
    const user = await this.prisma.users.findUnique({
      where: { id: params.userId },
      select: { language: true },
    });
    const { title, body } = buildNotificationText(params.type, user?.language ?? null, params.payload ?? {});

    const notification = await this.prisma.notifications.create({
      data: {
        user_id: params.userId,
        type: params.type,
        title,
        body,
        payload: params.payload,
        dedup_key: params.dedupKey,
      },
    });

    await this.notificationQueue.add('deliver-notification', {
      notificationId: notification.id,
    } satisfies NotificationDeliveryJob);
  }

  async list(userId: number, unreadOnly: boolean): Promise<notifications[]> {
    return await this.prisma.notifications.findMany({
      where: { user_id: userId, ...(unreadOnly ? { is_read: false } : {}) },
      orderBy: { created_at: 'desc' },
    });
  }

  async markRead(id: number, userId: number): Promise<void> {
    await this.prisma.notifications.updateMany({
      where: { id, user_id: userId },
      data: { is_read: true, read_at: new Date() },
    });
  }

  async resolveByDedupKey(userId: number, dedupKey: string): Promise<void> {
    await this.prisma.notifications.updateMany({
      where: { user_id: userId, dedup_key: dedupKey },
      data: { is_read: true, read_at: new Date() },
    });
  }

  /**
   * Closes the ask about one Strava activity once the ride has been assigned.
   * Matched on the payload rather than a dedup key: these notifications carry
   * none, because every ride is its own event.
   */
  async resolveActivityAsk(userId: number, activityId: string): Promise<void> {
    await this.prisma.notifications.updateMany({
      where: {
        user_id: userId,
        type: 'strava_activity_unassigned',
        is_read: false,
        payload: { path: ['activityId'], equals: activityId },
      },
      data: { is_read: true, read_at: new Date() },
    });
  }
}
