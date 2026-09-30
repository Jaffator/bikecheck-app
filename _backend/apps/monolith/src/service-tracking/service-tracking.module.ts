import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { PLAN_REMINDER_QUEUE } from './plan-reminder';
import { PlanReminderProcessor } from './plan-reminder.processor';
import { ServiceTrackingController } from './service-tracking.controller';
import { ServiceTrackingService } from './service-tracking.service';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    BullModule.registerQueue({
      name: PLAN_REMINDER_QUEUE,
      // A finished job must not linger: its id is the owner and the day.
      defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
    }),
  ],
  controllers: [ServiceTrackingController],
  providers: [ServiceTrackingService, PlanReminderProcessor],
  exports: [ServiceTrackingService],
})
export class ServiceTrackingModule {}
