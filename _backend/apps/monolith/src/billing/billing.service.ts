import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, bike_keys, users } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ResponseBikeLimitDto } from './dto/response-bike-limit.dto';

type AccountLimit = Pick<users, 'bike_limit' | 'bike_key_id'>;

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  // Archived bikes count too: only deleting a bike frees its place.
  async bikeLimit(userId: number): Promise<ResponseBikeLimitDto> {
    const [user, bikeCount, archivedCount] = await Promise.all([
      this.prisma.users.findUnique({ where: { id: userId }, select: { bike_limit: true, bike_key_id: true } }),
      this.prisma.bikes.count({ where: { user_id: userId } }),
      this.prisma.bikes.count({ where: { user_id: userId, is_deleted: true } }),
    ]);
    if (!user) throw new NotFoundException('User not found');

    return {
      bike_limit: user.bike_limit,
      bike_count: bikeCount,
      has_archived_bikes: archivedCount > 0,
      key_used: user.bike_key_id !== null,
    };
  }

  // Cheap refusal before any photo is stored; holdBikePlace is what actually keeps the limit.
  async requireBikePlace(userId: number): Promise<void> {
    const { bike_limit: limit, bike_count: count } = await this.bikeLimit(userId);
    refuseOverLimit(count, limit);
  }

  // Locks the account row until the creating transaction ends, so two requests cannot take one place.
  async holdBikePlace(db: Prisma.TransactionClient, userId: number): Promise<void> {
    const account = await lockAccount(db, userId);
    refuseOverLimit(await db.bikes.count({ where: { user_id: userId } }), account.bike_limit);
  }

  // One key per account: a repeat, whatever it carries, changes nothing.
  async redeemKey(userId: number, code: string): Promise<ResponseBikeLimitDto> {
    await this.prisma.$transaction(async (db) => {
      const account = await lockAccount(db, userId);
      if (account.bike_key_id !== null) return;

      const key = await lockKey(db, code);
      const uses = await db.users.count({ where: { bike_key_id: key.id } });
      if (uses >= key.max_accounts) throw new ConflictException('KEY_USED_UP');

      // A limit raised by hand is never lowered.
      const bikeLimit = Math.max(account.bike_limit, key.bike_limit);
      await db.users.update({ where: { id: userId }, data: { bike_key_id: key.id, bike_limit: bikeLimit } });
    });

    return await this.bikeLimit(userId);
  }
}

function refuseOverLimit(bikeCount: number, bikeLimit: number): void {
  if (bikeCount >= bikeLimit) throw new ForbiddenException('BIKE_LIMIT_REACHED');
}

async function lockAccount(db: Prisma.TransactionClient, userId: number): Promise<AccountLimit> {
  const [account] = await db.$queryRaw<AccountLimit[]>`
    SELECT bike_limit, bike_key_id FROM users WHERE id = ${userId} FOR UPDATE
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
