import type { Queue } from 'bullmq';
import type { notifications } from '@prisma/client';
import { NotificationService } from './notification.service';
import type { PrismaService } from '../../prisma/prisma.service';

const OWNER_ID = 7;

interface ListArgs {
  where: { user_id: number; is_read?: boolean; id?: { lt: number } };
  orderBy: { id: 'desc' };
  take?: number;
}

function row(id: number, isRead = false): notifications {
  return {
    id,
    user_id: OWNER_ID,
    type: 'strava_activity_saved',
    title: 'New ride',
    body: 'Ride added',
    payload: null,
    is_read: isRead,
    read_at: null,
    created_at: new Date(Date.UTC(2026, 0, 1, 0, id)),
    dedup_key: null,
  };
}

// Reads the list's query back the way Postgres would, so a test asserts the slice, not the query.
function table(rows: notifications[]): jest.Mock {
  return jest.fn(({ where, take }: ListArgs): Promise<notifications[]> => {
    const matching = rows
      .filter((one) => one.user_id === where.user_id)
      .filter((one) => where.is_read === undefined || one.is_read === where.is_read)
      .filter((one) => where.id === undefined || one.id < where.id.lt)
      .sort((one, other) => other.id - one.id);
    return Promise.resolve(take === undefined ? matching : matching.slice(0, take));
  });
}

function serviceOver(rows: notifications[]): NotificationService {
  const prisma = { notifications: { findMany: table(rows) } } as unknown as PrismaService;
  return new NotificationService({ add: jest.fn() } as unknown as Queue, prisma);
}

const ids = (rows: notifications[]): number[] => rows.map((one) => one.id);

describe('NotificationService.list', () => {
  const hundredTwenty = Array.from({ length: 120 }, (_, index) => row(index + 1));

  it('returns the newest 30 by default', async () => {
    const list = await serviceOver(hundredTwenty).list(OWNER_ID, {});

    expect(list).toHaveLength(30);
    expect(ids(list).slice(0, 2)).toEqual([120, 119]);
    expect(list[29].id).toBe(91);
  });

  it('returns the page older than the cursor, newest first', async () => {
    const list = await serviceOver(hundredTwenty).list(OWNER_ID, { before: 91, limit: 5 });

    expect(ids(list)).toEqual([90, 89, 88, 87, 86]);
  });

  it('caps the page at 100', async () => {
    const list = await serviceOver(hundredTwenty).list(OWNER_ID, { limit: 500 });

    expect(list).toHaveLength(100);
  });

  // The badge and the Unread filter count every unread row, however old.
  it('ignores the limit when reading unread only', async () => {
    const rows = [...hundredTwenty, row(121, true)];

    const list = await serviceOver(rows).list(OWNER_ID, { unreadOnly: true, limit: 5 });

    expect(list).toHaveLength(120);
    expect(ids(list)).not.toContain(121);
  });
});
