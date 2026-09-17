import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type AccountEventKind = 'verified' | 'deleted';

// Either the shared client or the transaction the caller is already in.
type Db = PrismaService | Prisma.TransactionClient;

const DAY_MS = 24 * 60 * 60 * 1000;

// The count of riders over time, kept without the riders (ADR 0028): a row when an email is
// verified, a row when an account is deleted. Read by Grafana, never by the app.
@Injectable()
export class AccountEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordVerified(db: Db = this.prisma): Promise<void> {
    await db.account_events.create({ data: { kind: 'verified' satisfies AccountEventKind } });
  }

  // How long the account lived, in whole days; null for one that never verified.
  async recordDeleted(verifiedAt: Date | null, db: Db = this.prisma): Promise<void> {
    const accountAgeDays = verifiedAt === null ? null : Math.floor((Date.now() - verifiedAt.getTime()) / DAY_MS);
    await db.account_events.create({
      data: { kind: 'deleted' satisfies AccountEventKind, account_age_days: accountAgeDays },
    });
  }
}
