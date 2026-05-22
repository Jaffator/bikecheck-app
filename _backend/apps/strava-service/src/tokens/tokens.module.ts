import { Module } from '@nestjs/common';
import { TokenService } from './tokens.service';
import { TokenController } from './tokens.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  controllers: [TokenController],
  providers: [TokenService],
  imports: [DatabaseModule],
  exports: [TokenService],
})
export class TokenModule {}
