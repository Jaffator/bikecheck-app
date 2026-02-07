import { Module } from '@nestjs/common';
import { RefreshTokenRepository } from './refreshtoken.repository';
import { PrismaService } from 'shared/prisma.service';

@Module({
  providers: [RefreshTokenRepository, PrismaService], // dependency injection
  exports: [RefreshTokenRepository],
})
export class RefreshTokenModule {}
