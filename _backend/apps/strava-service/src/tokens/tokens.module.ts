import { Module } from '@nestjs/common';
import { TokenService } from './tokens.service';
import { TokenController } from './tokens.controller';
import { DatabaseModule } from '../database/database.module';
import { BullModule } from '@nestjs/bullmq/dist/bull.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'strava-monolith-queue' }), DatabaseModule],
  controllers: [TokenController],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
