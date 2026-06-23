import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq/dist/decorators/inject-queue.decorator';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from './notification-types.config';
import { notifications, Prisma } from '@prisma/client';
import { DeviceTokenDto } from './dto/device-token-.dto';

export interface NotificationDeliveryJob {
  notificationId: number;
}

export interface CreateNotificationParams {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Prisma.InputJsonObject;
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

    const notification = await this.prisma.notifications.create({
      data: {
        user_id: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
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
}
