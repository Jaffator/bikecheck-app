import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { PrismaService } from 'shared/prisma.service';

@Module({
  controllers: [UserController], //Registrer routes from UserController, HTTP routing
  providers: [UserService, UserRepository, PrismaService], // dependency injection
  exports: [UserService],
})
export class UserModule {}
