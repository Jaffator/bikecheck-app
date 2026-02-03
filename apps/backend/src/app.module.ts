import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
// import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
// import { APP_GUARD } from '@nestjs/core/constants';

@Module({
  imports: [UserModule, AuthModule],
  // providers: [
  //   {
  //     provide: APP_GUARD,
  //     useClass: JwtAuthGuard,
  //   },
  // ],
})
export class AppModule {}
