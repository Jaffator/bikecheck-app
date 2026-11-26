import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, bike_keys, users } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ResponseBikeLimitDto } from './dto/response-bike-limit.dto';

type AccountLimit = Pick<users, 'bike_limit' | 'pro_since'>;

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  // Archived bikes count too: only deleting a bike frees its place.
  async bikeLimit(userId: number): Promise<ResponseBikeLimitDto> {
    const [user, bikeCount, archivedCount] = await Promise.all([
      this.prisma.users.findUnique({ where: { id: userId }, select: { bike_limit: true, pro_since: true } }),
      this.prisma.bikes.count({ where: { user_id: userId } }),
      this.prisma.bikes.count({ where: { user_id: userId, is_deleted: true } }),
    ]);
    if (!user) throw new NotFoundException('User not found');

    return {
      bike_limit: user.bike_limit,
      bike_count: bikeCount,
      has_archived_bikes: archivedCount > 0,
      pro_since: user.pro_since,
    };
  }

  // Cheap refusal before any photo is stored; holdBikePlace is what actually keeps the limit.
  async requireBikePlace(userId: number): Promise<void> {
    const state = await this.bikeLimit(userId);
    refuseOverLimit(state, state.bike_count);
  }

  // Locks the account row until the creating transaction ends, so two requests cannot take one place.
  async holdBikePlace(db: Prisma.TransactionClient, userId: number): Promise<void> {
    const account = await lockAccount(db, userId);
    refuseOverLimit(account, await db.bikes.count({ where: { user_id: userId } }));
  }

  // Pro has no end (ADR 0048): an account that has it, whatever it enters, keeps it as it stands.
  async redeemKey(userId: number, code: string): Promise<ResponseBikeLimitDto> {
    await this.prisma.$transaction(async (db) => {
      const account = await lockAccount(db, userId);
      if (account.pro_since !== null) return;

      const key = await lockKey(db, code);
      const uses = await db.users.count({ where: { bike_key_id: key.id } });
      if (uses >= key.max_accounts) throw new ConflictException('KEY_USED_UP');

      await db.users.update({ where: { id: userId }, data: { bike_key_id: key.id, pro_since: new Date() } });
    });

    return await this.bikeLimit(userId);
  }
}

function refuseOverLimit({ pro_since, bike_limit }: AccountLimit, bikeCount: number): void {
  if (pro_since === null && bikeCount >= bike_limit) throw new ForbiddenException('BIKE_LIMIT_REACHED');
}

async function lockAccount(db: Prisma.TransactionClient, userId: number): Promise<AccountLimit> {
  const [account] = await db.$queryRaw<AccountLimit[]>`
    SELECT bike_limit, pro_since FROM users WHERE id = ${userId} FOR UPDATE
  `;
  if (!account) throw new NotFoundException('User not found');

  return account;
}

// Locked until the redeeming transaction ends, so simultaneous requests cannot pass the cap.
async function lockKey(db: Prisma.TransactionClient, code: string): Promise<bike_keys> {
  const [key] = await db.$queryRaw<bike_keys[]>`
    SELECT * FROM bike_keys WHERE lower(btrim(code)) = lower(${code}) FOR UPDATE
  `;
  if (!key) throw new NotFoundException('KEY_NOT_VALID');

  return key;
}
