import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AccountEventsService } from './account-events.service';

@Module({
  imports: [PrismaModule],
  providers: [AccountEventsService],
  exports: [AccountEventsService],
})
export class AccountEventsModule {}
