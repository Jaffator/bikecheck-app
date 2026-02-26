import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { users as UserFull } from '@prisma/client';
import { RefreshTokenRepository } from '../refreshtoken/refreshtoken.repository';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async loginUserLocal(email: string, password: string): Promise<UserFull | null> {
    const user = await this.userService.getUserbyEmail(email);
    if (!user) {
      this.logger.warn(`User not found: ${email}`);
      return null;
    }
    // password and email check
    if (user.password_hash) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (isMatch) {
        this.logger.log(`User logged in: ${user.id}`);
        return user;
      }
    }
    // check if email and googleID exist
    if (!user.password_hash && user.googleId && user.email === email) {
      this.logger.warn(`Google account attempted local login: ${user.name}`);
      throw new UnauthorizedException('This account was created by google account, use Google sign in instead');
    }

    this.logger.warn(`User has no authentication method: ${user.id}`);
    return null;
  }
  async logout(refresh_token: string): Promise<void> {
    if (!refresh_token) return;
    await this.refreshTokenRepository.revokeToken(refresh_token);
    this.logger.log(`Token has been revoked`);
  }
}
