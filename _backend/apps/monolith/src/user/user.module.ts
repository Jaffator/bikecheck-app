import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AccountEventsModule } from '../account-events/account-events.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, AccountEventsModule, NotificationModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
