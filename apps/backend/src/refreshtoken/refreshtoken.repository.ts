import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { refresh_tokens } from '@prisma/client';

@Injectable()
export class RefreshTokenRepository {
  constructor(private prisma: PrismaService) {}

  async create(
    user_id: number,
    refresh_token: string,
    expires_at: Date,
    user_agent?: string,
    ip_address?: string,
  ): Promise<refresh_tokens> {
    return await this.prisma.refresh_tokens.create({
      data: {
        user_id,
        refresh_token,
        expires_at,
        user_agent,
        ip_address,
      },
    });
  }

  async findByToken(refresh_token: string): Promise<refresh_tokens | null> {
    return await this.prisma.refresh_tokens.findUnique({
      where: { refresh_token },
    });
  }

  async revokeToken(refresh_token: string): Promise<void> {
    await this.prisma.refresh_tokens.update({
      where: { refresh_token },
      data: {
        revoked: true,
        revoked_at: new Date(),
      },
    });
  }

  async revokeAllUserTokens(user_id: number): Promise<void> {
    await this.prisma.refresh_tokens.updateMany({
      where: { user_id, revoked: false },
      data: {
        revoked: true,
        revoked_at: new Date(),
      },
    });
  }

  async deleteExpiredTokens(): Promise<void> {
    await this.prisma.refresh_tokens.deleteMany({
      where: {
        expires_at: { lt: new Date() },
      },
    });
  }

  async getUserActiveTokens(user_id: number): Promise<refresh_tokens[]> {
    return await this.prisma.refresh_tokens.findMany({
      where: {
        user_id,
        revoked: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
