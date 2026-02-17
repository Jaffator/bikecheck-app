import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { users as UserFull } from '@prisma/client';
import { RefreshTokenRepository } from 'src/refreshtoken/refreshtoken.repository';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async loginUserLocal(email: string, password: string): Promise<UserFull | null> {
    const user = await this.userService.getUserbyEmail(email);
    if (!user) {
      return null;
    }
    // password and email check
    if (user && user.password_hash) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (isMatch) {
        return user;
      }
    }
    // check if email and googleID exist
    if (!user.password_hash && user.googleId && user.email === email) {
      throw new UnauthorizedException('This account was created by google account, use Google sign in instead');
    }
    return null;
  }
  async logout(refresh_token: string) {
    await this.refreshTokenRepository.revokeToken(refresh_token);
  }
}
