import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { follow_status, profile_visibility } from '@prisma/client';
import { FollowService } from './follow.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

const OWNER_ID = 7;
const ME = 8;
const NOW = new Date('2026-09-20T10:00:00.000Z');

interface ProfileRow {
  user_id: number;
  handle: string;
  visibility: profile_visibility;
}

interface FollowRow {
  follower_id: number;
  followed_id: number;
  status: follow_status;
  created_at: Date;
  accepted_at: Date | null;
}

// Everything the users row carries, so a test can assert what of it never reaches a payload.
interface UserRow {
  id: number;
  name: string | null;
  email: string;
  googleId: string | null;
  strava_athlete_id: string | null;
  strava_username: string | null;
  avatar_url: string | null;
}

interface Pair {
  follower_id: number;
  followed_id: number;
}

describe('FollowService', () => {
  let service: FollowService;

  // The three tables in memory, so what an act leaves behind is read back through the
  // service rather than asserted on the call that wrote it.
  const profiles = new Map<number, ProfileRow>();
  const users = new Map<number, UserRow>();
  const follows: FollowRow[] = [];

  const findFollow = (pair: Pair): FollowRow | undefined =>
    follows.find((row) => row.follower_id === pair.follower_id && row.followed_id === pair.followed_id);

  const mockPrisma = {
    public_profiles: {
      findUnique: jest.fn(({ where }: { where: { handle: string } }) =>
        Promise.resolve([...profiles.values()].find((row) => row.handle === where.handle) ?? null),
      ),
    },
    // The whole row comes back whatever the select asked, so what the payload leaves out
    // is the service's doing, not the mock's; the profile hangs off it as the include shapes it.
    users: {
      findUnique: jest.fn(({ where }: { where: { id: number } }) => {
        const user = users.get(where.id);
        if (!user) return Promise.resolve(null);
        const profile = profiles.get(user.id);
        return Promise.resolve({ ...user, public_profile: profile ? { handle: profile.handle } : null });
      }),
    },
    follows: {
      findUnique: jest.fn(({ where }: { where: { follower_id_followed_id: Pair } }) =>
        Promise.resolve(findFollow(where.follower_id_followed_id) ?? null),
      ),
      create: jest.fn(({ data }: { data: Omit<FollowRow, 'created_at'> & { created_at?: Date } }) => {
        if (findFollow(data)) return Promise.reject(new Error('Unique constraint failed'));
        const row: FollowRow = { ...data, created_at: data.created_at ?? NOW };
        follows.push(row);
        return Promise.resolve(row);
      }),
      deleteMany: jest.fn(({ where }: { where: Pair }) => {
        const before = follows.length;
        for (let i = follows.length - 1; i >= 0; i--) {
          if (follows[i].follower_id === where.follower_id && follows[i].followed_id === where.followed_id) {
            follows.splice(i, 1);
          }
        }
        return Promise.resolve({ count: before - follows.length });
      }),
    },
  };

  const mockNotifications = { create: jest.fn(), resolveByDedupKey: jest.fn() };

  const seedProfile = (userId: number, handle: string, visibility: profile_visibility): void => {
    profiles.set(userId, { user_id: userId, handle, visibility });
  };

  // An account with every private field filled, so the payload has plenty to leave out.
  const seedUser = (id: number, name: string | null): void => {
    users.set(id, {
      id,
      name,
      email: `user${String(id)}@example.com`,
      googleId: `google-${String(id)}`,
      strava_athlete_id: `strava-${String(id)}`,
      strava_username: `strava_${String(id)}`,
      avatar_url: 'https://lh3.googleusercontent.com/photo',
    });
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    profiles.clear();
    users.clear();
    follows.length = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<FollowService>(FollowService);

    seedUser(OWNER_ID, 'Jarda Novák');
    seedUser(ME, 'Petr Dvořák');
    seedProfile(OWNER_ID, 'jaffa', profile_visibility.PUBLIC);
  });

  describe('follow - a Public profile', () => {
    it('writes one ACCEPTED row, accepted the moment it was made, and answers FOLLOWING', async () => {
      const answer = await service.follow(ME, 'jaffa');

      expect(answer).toEqual({ relation: 'FOLLOWING' });
      expect(follows).toHaveLength(1);
      expect(follows[0]).toMatchObject({ follower_id: ME, followed_id: OWNER_ID, status: 'ACCEPTED' });
      expect(follows[0].accepted_at).toEqual(follows[0].created_at);
    });

    it('tells the owner once: new_follower keyed on the follower, named by name and handle', async () => {
      seedProfile(ME, 'petr', profile_visibility.FOLLOWERS);

      await service.follow(ME, 'jaffa');

      expect(mockNotifications.create).toHaveBeenCalledTimes(1);
      expect(mockNotifications.create).toHaveBeenCalledWith({
        userId: OWNER_ID,
        type: 'new_follower',
        dedupKey: `new_follower:${String(ME)}`,
        payload: { handle: 'petr', personName: 'Petr Dvořák' },
      });
    });

    it('names a follower without a profile by name alone, and one without a name by handle alone', async () => {
      await service.follow(ME, 'jaffa');
      expect(mockNotifications.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ payload: { personName: 'Petr Dvořák' } }),
      );

      follows.length = 0;
      seedUser(ME, null);
      seedProfile(ME, 'petr', profile_visibility.PUBLIC);
      await service.follow(ME, 'jaffa');
      expect(mockNotifications.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ payload: { handle: 'petr' } }),
      );
    });

    it('matches the handle whatever its case', async () => {
      await service.follow(ME, '  JAFFA ');

      expect(follows[0]).toMatchObject({ followed_id: OWNER_ID });
    });

    it('a second POST leaves the row as it is, tells nobody again, and answers the standing relation', async () => {
      await service.follow(ME, 'jaffa');
      const [first] = follows;

      const answer = await service.follow(ME, 'jaffa');

      expect(answer).toEqual({ relation: 'FOLLOWING' });
      expect(follows).toEqual([first]);
      expect(mockNotifications.create).toHaveBeenCalledTimes(1);
    });

    it('a follower who left comes back as a new row', async () => {
      await service.follow(ME, 'jaffa');
      await service.unfollow(ME, 'jaffa');

      const answer = await service.follow(ME, 'jaffa');

      expect(answer).toEqual({ relation: 'FOLLOWING' });
      expect(follows).toHaveLength(1);
    });
  });

  describe('follow - refused', () => {
    it('my own handle answers 400 and writes nothing', async () => {
      await expect(service.follow(OWNER_ID, 'jaffa')).rejects.toBeInstanceOf(BadRequestException);

      expect(follows).toHaveLength(0);
      expect(mockNotifications.create).not.toHaveBeenCalled();
    });

    it('my own handle answers 400 even with the profile Off', async () => {
      seedProfile(OWNER_ID, 'jaffa', profile_visibility.OFF);

      await expect(service.follow(OWNER_ID, 'jaffa')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('OFF and an unknown handle answer one identical 404 and write nothing', async () => {
      seedProfile(OWNER_ID, 'jaffa', profile_visibility.OFF);

      const off = service.follow(ME, 'jaffa').catch((error: unknown) => error);
      const unknown = service.follow(ME, 'nobody').catch((error: unknown) => error);

      expect(await off).toBeInstanceOf(NotFoundException);
      expect(await unknown).toBeInstanceOf(NotFoundException);
      expect((await off) as Error).toMatchObject({ message: ((await unknown) as Error).message });
      expect(follows).toHaveLength(0);
      expect(mockNotifications.create).not.toHaveBeenCalled();
    });

    // A Followers-only profile takes a Follow Request, which is the request slice's (#146);
    // until it lands there is nothing here to answer with but the closed door.
    it('FOLLOWERS answers 404 and writes nothing', async () => {
      seedProfile(OWNER_ID, 'jaffa', profile_visibility.FOLLOWERS);

      await expect(service.follow(ME, 'jaffa')).rejects.toBeInstanceOf(NotFoundException);

      expect(follows).toHaveLength(0);
      expect(mockNotifications.create).not.toHaveBeenCalled();
    });

    it('a row that stands is answered whatever the profile turned to since', async () => {
      await service.follow(ME, 'jaffa');
      seedProfile(OWNER_ID, 'jaffa', profile_visibility.FOLLOWERS);

      expect(await service.follow(ME, 'jaffa')).toEqual({ relation: 'FOLLOWING' });
      expect(follows).toHaveLength(1);
    });
  });

  describe('unfollow', () => {
    it('removes the row and tells nobody', async () => {
      await service.follow(ME, 'jaffa');
      mockNotifications.create.mockClear();

      await service.unfollow(ME, 'jaffa');

      expect(follows).toHaveLength(0);
      expect(mockNotifications.create).not.toHaveBeenCalled();
      expect(mockNotifications.resolveByDedupKey).not.toHaveBeenCalled();
    });

    it('with no row: resolves and touches nothing', async () => {
      await expect(service.unfollow(ME, 'jaffa')).resolves.toBeUndefined();

      expect(mockNotifications.create).not.toHaveBeenCalled();
      expect(mockNotifications.resolveByDedupKey).not.toHaveBeenCalled();
    });

    it('with an unknown handle: resolves too', async () => {
      await expect(service.unfollow(ME, 'nobody')).resolves.toBeUndefined();
    });

    it('works on a profile that went Off since - the row is the follower to keep or drop', async () => {
      await service.follow(ME, 'jaffa');
      seedProfile(OWNER_ID, 'jaffa', profile_visibility.OFF);

      await service.unfollow(ME, 'jaffa');

      expect(follows).toHaveLength(0);
    });

    it('removes my row only, never another follower of the same owner', async () => {
      await service.follow(ME, 'jaffa');
      seedUser(9, 'Third');
      await service.follow(9, 'jaffa');

      await service.unfollow(ME, 'jaffa');

      expect(follows.map((row) => row.follower_id)).toEqual([9]);
    });

    it('matches the handle whatever its case', async () => {
      await service.follow(ME, 'jaffa');

      await service.unfollow(ME, ' Jaffa ');

      expect(follows).toHaveLength(0);
    });
  });
});
