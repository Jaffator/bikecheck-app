import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ResponseBikeLimitDto } from './dto/response-bike-limit.dto';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  // Archived bikes count too: only deleting a bike frees its place.
  async bikeLimit(userId: number): Promise<ResponseBikeLimitDto> {
    const [user, bikeCount, archivedCount] = await Promise.all([
      this.prisma.users.findUnique({ where: { id: userId }, select: { bike_limit: true } }),
      this.prisma.bikes.count({ where: { user_id: userId } }),
      this.prisma.bikes.count({ where: { user_id: userId, is_deleted: true } }),
    ]);
    if (!user) throw new NotFoundException('User not found');

    return { bike_limit: user.bike_limit, bike_count: bikeCount, has_archived_bikes: archivedCount > 0 };
  }

  // Cheap refusal before any photo is stored; holdBikePlace is what actually keeps the limit.
  async requireBikePlace(userId: number): Promise<void> {
    const { bike_limit: limit, bike_count: count } = await this.bikeLimit(userId);
    refuseOverLimit(count, limit);
  }

  // Locks the account row until the creating transaction ends, so two requests cannot take one place.
  async holdBikePlace(db: Prisma.TransactionClient, userId: number): Promise<void> {
    const [user] = await db.$queryRaw<{ bike_limit: number }[]>`
      SELECT bike_limit FROM users WHERE id = ${userId} FOR UPDATE
    `;
    if (!user) throw new NotFoundException('User not found');

    refuseOverLimit(await db.bikes.count({ where: { user_id: userId } }), user.bike_limit);
  }
}

function refuseOverLimit(bikeCount: number, bikeLimit: number): void {
  if (bikeCount >= bikeLimit) throw new ForbiddenException('BIKE_LIMIT_REACHED');
}
