import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GeminiProcessor } from './gemini.processor';
import { GeminiService } from './gemini.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'gemini-queue' }), PrismaModule],
  providers: [GeminiProcessor, GeminiService],
})
export class GeminiModule {}
