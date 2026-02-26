import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { users as UserFull } from '@prisma/client';
import { RefreshTokenRepository } from '../refreshtoken/refreshtoken.repository';
import { randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { AUTH_CONFIG } from './auth.config';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  constructor(
    private refreshTokenRepository: RefreshTokenRepository,
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  // ---- Public methods ----

  async refreshToken(
    currentRefreshToken: string,
    deviceInfo: string,
    ip: string,
  ): Promise<{ refreshToken: string; accessToken: string }> {
    // 1. Refresh token doesn exist or it's revoked -> throw exception

    const refreshTokenInfo = await this.refreshTokenRepository.findByToken(currentRefreshToken);
    if (!refreshTokenInfo || refreshTokenInfo.revoked === true) {
      this.logger.error(`Token doesn exist`);
      throw new UnauthorizedException('Session expired');
    }

    const user = await this.userService.getUserbyId(refreshTokenInfo.user_id);
    if (!user) throw new UnauthorizedException('User not found');

    // 2. Refresh Token expired -> REVOKE and throw expection

    if (new Date() > refreshTokenInfo.expires_at) {
      await this.refreshTokenRepository.revokeToken(currentRefreshToken);
      this.logger.error(`Token expired`);
      throw new UnauthorizedException('Session expired');
    }
    const accessToken = this.generateAccessToken(user);

    if (this.validateTokenExpiracy(refreshTokenInfo.expires_at)) {
      // 3. Refresh token close to end, generate new one
      const { refreshToken, expiresAt } = this.generateRefreshToken();
      await this.refreshTokenRepository.revokeAndCreateNew(
        currentRefreshToken,
        user.id,
        refreshToken,
        expiresAt,
        deviceInfo,
        ip,
      );
      this.logger.debug(`Refresh and Access token created`);
      return { refreshToken, accessToken };
    }

    // Refresh token still ok, return just new access token
    this.logger.debug('Refresh token reused');
    return { refreshToken: currentRefreshToken, accessToken };
  }

  async createRefreshAndAccessTokens(
    user: UserFull,
    deviceInfo: string,
    ip: string,
  ): Promise<{ refreshToken: string; accessToken: string }> {
    const { refreshToken, expiresAt } = this.generateRefreshToken();
    await this.refreshTokenRepository.create(user.id, refreshToken, expiresAt, deviceInfo, ip);
    const accessToken = this.generateAccessToken(user);
    return { refreshToken, accessToken };
  }

  // ---- Private methods ----

  private generateAccessToken(user: UserFull): string {
    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload, { expiresIn: AUTH_CONFIG.JWT_EXPIRATION });
    return accessToken;
  }

  private generateRefreshToken(): { refreshToken: string; expiresAt: Date } {
    const refreshToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + AUTH_CONFIG.REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000); // days
    return { refreshToken, expiresAt };
  }

  private validateTokenExpiracy(expireDate: Date): boolean {
    const timeDiff = expireDate.getTime() - new Date().getTime(); //difference in ms
    const hoursLeft = timeDiff / 1000 / 60 / 60;
    if (hoursLeft > 24) return false;
    else return true;
  }
}
