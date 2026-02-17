import { Injectable, NotFoundException } from '@nestjs/common';
import { users as UserFull } from '@prisma/client';
import { RefreshTokenRepository } from 'src/refreshtoken/refreshtoken.repository';
import { randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { AUTH_CONFIG } from './auth.config';
import chalk from 'chalk';
type TokensType = {
  newRefreshToken: string;
  newJwt_token: string;
};

@Injectable()
export class TokenService {
  constructor(
    private refreshTokenRepository: RefreshTokenRepository,
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  async refreshToken(refreshToken: string, deviceInfo: string, ip: string): Promise<TokensType> {
    // 1. Refresh token doesn exist or it's revoked -> throw exception
    const refreshTokenInfo = await this.refreshTokenRepository.findByToken(refreshToken);
    if (!refreshTokenInfo || refreshTokenInfo.revoked === true) {
      console.log(chalk.bgRed(`Token doesn exist`));
      throw new NotFoundException('Session expired');
    }

    const user = await this.userService.getUserbyId(refreshTokenInfo.user_id);
    if (!user) throw new NotFoundException('User not found');

    // 2. Refresh Token expired -> REVOKE and throw expection
    console.log(new Date(), refreshTokenInfo.expires_at!);
    if (new Date() > refreshTokenInfo.expires_at!) {
      await this.refreshTokenRepository.revokeToken(refreshToken);
      console.log(chalk.bgRed(`Token expired`));
      throw new NotFoundException('Session expired');
    }

    // 3. Refresh Token valid -> Generate new Access and Refresh tokens (sliding token window)
    await this.refreshTokenRepository.revokeToken(refreshToken);
    const newRefreshToken = await this.generateRefreshToken(user, deviceInfo, ip);
    const newJwt_token = this.generateAccessToken(user);
    console.log(chalk.bgGreen(`Token valid, create new one`));
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
    const jwtToken = this.jwtService.sign(payload, { expiresIn: AUTH_CONFIG.JWT_EXPIRATION });
    return jwtToken;
  }

  private async generateRefreshToken(user: UserFull, deviceInfo?: string, ip?: string): Promise<string> {
    const refreshToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + AUTH_CONFIG.REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000); // days

    await this.refreshTokenRepository.create(user.id, refreshToken, expiresAt, deviceInfo, ip);

    return refreshToken;
  }
}
