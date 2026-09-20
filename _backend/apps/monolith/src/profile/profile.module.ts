import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { FollowModule } from '../follow/follow.module';

@Module({
  imports: [PrismaModule, FollowModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
