import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './strategy/local.strategy';
import { JwtStrategy } from './strategy/jwt.strategy';
import { GoogleStrategy } from './strategy/google.strategy';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { RefreshTokenModule } from 'src/refreshtoken/refreshtoken.module';
import { GoogleAuthService } from './googleAuth.service';
import { TokenService } from './token.service';
import { AUTH_CONFIG } from './auth.config';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.register({
      secret: AUTH_CONFIG.JWT_SECRET,
    }),
    RefreshTokenModule,
  ],
  providers: [AuthService, GoogleAuthService, TokenService, LocalStrategy, JwtStrategy, GoogleStrategy],
  exports: [AuthService, GoogleAuthService, TokenService],
  controllers: [AuthController],
})
export class AuthModule {}
