import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { users as UserFull } from '@prisma/client';
import { RefreshTokenRepository } from '../refreshtoken/refreshtoken.repository';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private refreshTokenRepository: RefreshTokenRepository,
    @InjectPinoLogger(AuthService.name) private readonly logger: PinoLogger,
  ) {}

  async loginUserLocal(email: string, password: string): Promise<UserFull | null> {
    const user = await this.userService.getUserbyEmail(email);
    if (!user) {
      this.logger.warn({ email }, 'User not found');
      return null;
    }

    if (user.password_hash) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (isMatch) {
        this.logger.info({ userId: user.id }, 'User logged in');
        return user;
      }

      this.logger.warn({ userId: user.id, email }, 'Invalid credentials');
      return null;
    }

    if (user.googleId && user.email === email) {
      this.logger.warn({ userId: user.id, email }, 'Google account attempted local login');
      throw new UnauthorizedException('This account was created by google account, use Google sign in instead');
    }

    this.logger.warn({ userId: user.id, email }, 'User has no authentication method');
    return null;
  }
  async logout(refresh_token: string): Promise<void> {
    if (!refresh_token) return;
    await this.refreshTokenRepository.revokeToken(refresh_token);
    this.logger.info('Token revoked');
  }
}
