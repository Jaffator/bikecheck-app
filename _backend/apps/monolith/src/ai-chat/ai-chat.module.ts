import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ServiceTrackingModule } from '../service-tracking/service-tracking.module';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';

@Module({
  imports: [PrismaModule, ServiceTrackingModule],
  controllers: [AiChatController],
  providers: [AiChatService],
})
export class AiChatModule {}
