import { Module } from '@nestjs/common';
import { RefreshTokenRepository } from './refreshtoken.repository';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RefreshTokenRepository], // dependency injection
  exports: [RefreshTokenRepository],
})
export class RefreshTokenModule {}
