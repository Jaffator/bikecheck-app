import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationProcessor } from './notification.processor';
import { PushService } from './push.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'notification-queue' }), PrismaModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationProcessor, PushService],
  exports: [NotificationService],
})
export class NotificationModule {}
