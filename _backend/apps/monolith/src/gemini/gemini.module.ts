import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GeminiProcessor } from './gemini.processor';
import { GeminiService } from './gemini.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'gemini-queue',
      defaultJobOptions: {
        // Retry on failure (e.g. Gemini "high demand, try again later").
        attempts: 5,
        // Exponential backoff: waits grow each retry -> 30s, 1m, 2m, 4m.
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: true,
      },
    }),
    PrismaModule,
  ],
  providers: [GeminiProcessor, GeminiService],
})
export class GeminiModule {}
