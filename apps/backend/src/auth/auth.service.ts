import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginGoogleDto } from './dto/auth.dtos';
import type { Response, Request } from 'express';
import { users as UserFull } from '@prisma/client';
import { RefreshTokenRepository } from 'src/refreshtoken/refreshtoken.repository';
import { randomBytes } from 'crypto';

type GoogleUserType = {
  user: UserFull;
  isNewUser: boolean;
};

type TokensType = {
  newRefreshToken: string;
  newJwt_token: string;
};

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async validateUserLocal(email: string, password: string): Promise<UserFull | null> {
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
  async registerOrLoginUserGoogle(dto: LoginGoogleDto): Promise<GoogleUserType> {
    // 1. Google user exist
    const userGoogle = await this.userService.getUserbyGoogleId(dto.googleId);
    if (userGoogle?.googleId === dto.googleId) {
      return { user: userGoogle, isNewUser: false };
    }

    // 2. Google user does NOT exist but email YES -> link googleiId to user account
    const userEmail = await this.userService.getUserbyEmail(dto.email);
    if (userEmail && userEmail?.googleId != dto.googleId && userEmail?.email === dto.email && dto.emailVerified) {
      const updatedUser = await this.userService.updateUserProfile(userEmail.id, {
        googleId: dto.googleId,
        avatar_url: dto.avatar_url,
      });
      return { user: updatedUser, isNewUser: false };
    }
    // 3 User does NOT exist at all -> create new register
    const newUser = await this.userService.createUserByGoogle(dto);
    return { user: newUser, isNewUser: true };
  }

  async refreshToken(refreshToken: string, deviceInfo: string, ip: string): Promise<TokensType> {
    // 1. Refresh token doesn exist or it's revoked -> throw exception
    const refreshTokenInfo = await this.refreshTokenRepository.findByToken(refreshToken);
    if (!refreshTokenInfo || refreshTokenInfo.revoked === true) {
      throw new NotFoundException('Session expired');
    }

    const user = await this.userService.getUserbyId(refreshTokenInfo.user_id);
    if (!user) throw new NotFoundException('User not found');

    // 2. Refresh Token expired -> REVOKE and throw expection
    if (new Date() > refreshTokenInfo.expires_at!) {
      await this.refreshTokenRepository.revokeToken(refreshToken);
      throw new NotFoundException('Session expired');
    }

    // 3. Refresh Token valid -> Generate new Access and Refresh tokens (sliding token window)
    await this.refreshTokenRepository.revokeToken(refreshToken);
    const newRefreshToken = await this.generateRefreshToken(user, deviceInfo, ip);
    const newJwt_token = this.generateAccessToken(user);
    return { newRefreshToken, newJwt_token };
  }

  async getTokens(user: UserFull, deviceInfo: string, ip: string): Promise<TokensType> {
    const newRefreshToken = await this.generateRefreshToken(user, deviceInfo, ip);
    const newJwt_token = this.generateAccessToken(user);
    return { newRefreshToken, newJwt_token };
  }
  // ---- Private methods ----

  private generateAccessToken(user: UserFull): string {
    const payload = { email: user.email, sub: user.id };
    const jwtToken = this.jwtService.sign(payload, { expiresIn: '30m' });
    return jwtToken;
  }

  private async generateRefreshToken(user: UserFull, deviceInfo?: string, ip?: string): Promise<string> {
    const refreshToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dní

    await this.refreshTokenRepository.create(user.id, refreshToken, expiresAt, deviceInfo, ip);

    return refreshToken;
  }
}
