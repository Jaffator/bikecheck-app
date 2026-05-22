import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UserController], //Registrer routes from UserController, HTTP routing
  providers: [UserService, UserRepository], // dependency injection
  exports: [UserService],
})
export class UserModule {}
