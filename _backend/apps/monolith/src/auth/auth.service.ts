import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { users as UserFull } from '@prisma/client';
import { RefreshTokenService } from '../refreshtoken/refreshtoken.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private refreshTokenRepository: RefreshTokenService,
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
  // The user is already logged in, so the old password is the only proof of identity
  // needed — no mailer, no reset token. The refresh token the request arrived with is kept
  // alive; every other session of theirs is dropped, because a changed password is exactly
  // when someone else's device has to stop working.
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
    currentRefreshToken: string | null,
  ): Promise<void> {
    const user = await this.userService.getUserbyId(userId);
    if (!user) {
      this.logger.warn({ userId }, 'Password change for unknown user');
      throw new UnauthorizedException('Invalid credentials');
    }

    // A Google account has no password to replace, so this is a bad request, not a
    // rejected credential.
    if (!user.password_hash) {
      this.logger.warn({ userId }, 'Password change on an account without a password');
      throw new BadRequestException('This account has no password to change');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      this.logger.warn({ userId }, 'Password change with wrong current password');
      throw new UnauthorizedException('Current password is not correct');
    }

    await this.userService.updatePassword(userId, newPassword);
    await this.refreshTokenRepository.revokeAllUserTokensExcept(userId, currentRefreshToken);
    this.logger.info({ userId }, 'Password changed, other sessions revoked');
  }

  async logout(refresh_token: string): Promise<void> {
    if (!refresh_token) return;
    await this.refreshTokenRepository.revokeToken(refresh_token);
    this.logger.info('Token revoked');
  }
}
