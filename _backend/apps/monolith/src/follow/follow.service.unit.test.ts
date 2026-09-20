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

// The where shapes the search sends, read back by the in-memory table the way Postgres
// would: prefix and word-prefix on the name are case-insensitive, nothing is unaccented.
interface NameFilter {
  startsWith?: string;
  contains?: string;
}

interface ProfileWhere {
  visibility?: { in: profile_visibility[] };
  user_id?: { not?: number; notIn?: number[] };
  handle?: { startsWith: string };
  users?: { OR: { name: NameFilter }[] };
}

// My outgoing side (a follower id, the counterparts maybe narrowed) or my incoming side (a
// followed id alone).
interface FollowsWhere {
  follower_id?: number;
  followed_id?: number | { in: number[] };
}

// What an accept writes on the row.
interface FollowUpdateData {
  status: follow_status;
  accepted_at: Date;
}

type Side = 'follower_id' | 'followed_id';

describe('FollowService', () => {
  let service: FollowService;

  // The three tables in memory, so what an act leaves behind is read back through the
  // service rather than asserted on the call that wrote it.
  const profiles = new Map<number, ProfileRow>();
  const users = new Map<number, UserRow>();
  const follows: FollowRow[] = [];

  const findFollow = (pair: Pair): FollowRow | undefined =>
    follows.find((row) => row.follower_id === pair.follower_id && row.followed_id === pair.followed_id);

  const matchesName = (name: string | null, filter: NameFilter): boolean => {
    if (name === null) return false;
    const lower = name.toLowerCase();
    if (filter.startsWith !== undefined) return lower.startsWith(filter.startsWith.toLowerCase());
    if (filter.contains !== undefined) return lower.includes(filter.contains.toLowerCase());
    return false;
  };

  const matchesProfile = (row: ProfileRow, where: ProfileWhere): boolean => {
    if (where.visibility && !where.visibility.in.includes(row.visibility)) return false;
    if (where.user_id?.not !== undefined && row.user_id === where.user_id.not) return false;
    if (where.user_id?.notIn !== undefined && where.user_id.notIn.includes(row.user_id)) return false;
    if (where.handle && !row.handle.startsWith(where.handle.startsWith)) return false;
    if (where.users && !where.users.OR.some((clause) => matchesName(users.get(row.user_id)?.name ?? null, clause.name)))
      return false;
    return true;
  };

  const byHandle = (a: ProfileRow, b: ProfileRow): number => (a.handle < b.handle ? -1 : a.handle > b.handle ? 1 : 0);

  // What the counterpart on one side reads as: name first, the handle breaking a tie, no
  // name last.
  const byNameThenHandle =
    (side: Side) =>
    (a: FollowRow, b: FollowRow): number => {
      const nameA = users.get(a[side])?.name ?? null;
      const nameB = users.get(b[side])?.name ?? null;
      if (nameA !== nameB) {
        if (nameA === null) return 1;
        if (nameB === null) return -1;
        return nameA < nameB ? -1 : 1;
      }
      const handleA = profiles.get(a[side])?.handle ?? '';
      const handleB = profiles.get(b[side])?.handle ?? '';
      return handleA < handleB ? -1 : handleA > handleB ? 1 : 0;
    };

  const matchesFollow = (row: FollowRow, where: FollowsWhere): boolean => {
    if (where.follower_id !== undefined && row.follower_id !== where.follower_id) return false;
    if (typeof where.followed_id === 'number') return row.followed_id === where.followed_id;
    if (where.followed_id !== undefined) return where.followed_id.in.includes(row.followed_id);
    return true;
  };

  // The account as the include hangs it off a row: the user, their profile if any.
  const counterpart = (id: number): Partial<UserRow> & { public_profile: ProfileRow | null } => ({
    ...users.get(id),
    public_profile: profiles.get(id) ?? null,
  });

  const mockPrisma = {
    public_profiles: {
      findUnique: jest.fn(({ where }: { where: { handle: string } }) =>
        Promise.resolve([...profiles.values()].find((row) => row.handle === where.handle) ?? null),
      ),
      // The whole user row rides along under `users` whatever the select asked, so a
      // private field in a result is the service's doing.
      findMany: jest.fn(({ where, take }: { where: ProfileWhere; take: number }) =>
        Promise.resolve(
          [...profiles.values()]
            .filter((row) => matchesProfile(row, where))
            .sort(byHandle)
            .slice(0, take)
            .map((row) => ({ ...row, users: users.get(row.user_id) ?? null })),
        ),
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
      // My rows on either side, both counterparts hanging off each as an include would,
      // in the order the list on that side reads: by the other party's name.
      findMany: jest.fn(({ where }: { where: FollowsWhere }) => {
        const incoming = typeof where.followed_id === 'number';
        return Promise.resolve(
          follows
            .filter((row) => matchesFollow(row, where))
            .sort(byNameThenHandle(incoming ? 'follower_id' : 'followed_id'))
            .map((row) => ({ ...row, followed: counterpart(row.followed_id), follower: counterpart(row.follower_id) })),
        );
      }),
      update: jest.fn(({ where, data }: { where: { follower_id_followed_id: Pair }; data: FollowUpdateData }) => {
        const row = findFollow(where.follower_id_followed_id);
        if (!row) return Promise.reject(new Error('Record to update not found'));
        Object.assign(row, data);
        return Promise.resolve(row);
      }),
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

  describe('follow - a Followers-only profile', () => {
    beforeEach(() => {
      seedProfile(OWNER_ID, 'jaffa', profile_visibility.FOLLOWERS);
    });

    it('writes one PENDING row, not yet accepted, and answers PENDING', async () => {
      const answer = await service.follow(ME, 'jaffa');

      expect(answer).toEqual({ relation: 'PENDING' });
      expect(follows).toHaveLength(1);
      expect(follows[0]).toMatchObject({
        follower_id: ME,
        followed_id: OWNER_ID,
        status: 'PENDING',
        accepted_at: null,
      });
    });

    it('asks the owner once: follow_request keyed on the asker, named by name and handle', async () => {
      seedProfile(ME, 'petr', profile_visibility.PUBLIC);

      await service.follow(ME, 'jaffa');

      expect(mockNotifications.create).toHaveBeenCalledTimes(1);
      expect(mockNotifications.create).toHaveBeenCalledWith({
        userId: OWNER_ID,
        type: 'follow_request',
        dedupKey: `follow_request:${String(ME)}`,
        payload: { handle: 'petr', personName: 'Petr Dvořák' },
      });
    });

    it('names an asker without a profile by name alone, and one without a name by handle alone', async () => {
      await service.follow(ME, 'jaffa');
      expect(mockNotifications.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: 'follow_request', payload: { personName: 'Petr Dvořák' } }),
      );

      follows.length = 0;
      seedUser(ME, null);
      seedProfile(ME, 'petr', profile_visibility.PUBLIC);
      await service.follow(ME, 'jaffa');
      expect(mockNotifications.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: 'follow_request', payload: { handle: 'petr' } }),
      );
    });

    it('a second POST leaves the request as it is, asks nobody again, and answers PENDING', async () => {
      await service.follow(ME, 'jaffa');
      const [first] = follows;

      const answer = await service.follow(ME, 'jaffa');

      expect(answer).toEqual({ relation: 'PENDING' });
      expect(follows).toEqual([first]);
      expect(mockNotifications.create).toHaveBeenCalledTimes(1);
    });

    // The brake on request spam is the notification's own dedup: the service asks under the
    // same key every time, and the owner is only ever pushed for the first.
    it('a request withdrawn and made again is a new row asked under the same key', async () => {
      await service.follow(ME, 'jaffa');
      await service.unfollow(ME, 'jaffa');

      const answer = await service.follow(ME, 'jaffa');

      expect(answer).toEqual({ relation: 'PENDING' });
      expect(follows).toHaveLength(1);
      expect(follows[0].status).toBe('PENDING');
      const keys = mockNotifications.create.mock.calls.map(([params]: [{ dedupKey: string }]) => params.dedupKey);
      expect(keys).toEqual([`follow_request:${String(ME)}`, `follow_request:${String(ME)}`]);
    });

    it('a request that stands is answered PENDING whatever the profile turned to since', async () => {
      await service.follow(ME, 'jaffa');
      seedProfile(OWNER_ID, 'jaffa', profile_visibility.PUBLIC);

      expect(await service.follow(ME, 'jaffa')).toEqual({ relation: 'PENDING' });
      expect(follows).toHaveLength(1);
      expect(follows[0].status).toBe('PENDING');
      expect(mockNotifications.create).toHaveBeenCalledTimes(1);
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

  describe('withdraw - a waiting request', () => {
    beforeEach(async () => {
      seedProfile(OWNER_ID, 'jaffa', profile_visibility.FOLLOWERS);
      await service.follow(ME, 'jaffa');
      mockNotifications.create.mockClear();
    });

    it("removes the row and resolves the owner's ask, so the badge drops", async () => {
      await service.unfollow(ME, 'jaffa');

      expect(follows).toHaveLength(0);
      expect(mockNotifications.resolveByDedupKey).toHaveBeenCalledTimes(1);
      expect(mockNotifications.resolveByDedupKey).toHaveBeenCalledWith(OWNER_ID, `follow_request:${String(ME)}`);
    });

    it('tells nobody', async () => {
      await service.unfollow(ME, 'jaffa');

      expect(mockNotifications.create).not.toHaveBeenCalled();
    });

    it("resolves my key only, never another asker's", async () => {
      seedUser(9, 'Third');
      await service.follow(9, 'jaffa');

      await service.unfollow(ME, 'jaffa');

      expect(follows.map((row) => row.follower_id)).toEqual([9]);
      expect(mockNotifications.resolveByDedupKey).toHaveBeenCalledTimes(1);
      expect(mockNotifications.resolveByDedupKey).toHaveBeenCalledWith(OWNER_ID, `follow_request:${String(ME)}`);
    });

    it('works on a profile that went Off since - the request is mine to take back', async () => {
      seedProfile(OWNER_ID, 'jaffa', profile_visibility.OFF);

      await service.unfollow(ME, 'jaffa');

      expect(follows).toHaveLength(0);
      expect(mockNotifications.resolveByDedupKey).toHaveBeenCalledWith(OWNER_ID, `follow_request:${String(ME)}`);
    });

    it('a second withdrawal finds no row and resolves nothing more', async () => {
      await service.unfollow(ME, 'jaffa');
      mockNotifications.resolveByDedupKey.mockClear();

      await expect(service.unfollow(ME, 'jaffa')).resolves.toBeUndefined();

      expect(mockNotifications.resolveByDedupKey).not.toHaveBeenCalled();
    });
  });

  // A row written straight into the table, so a list test needs no round trip through follow().
  const seedFollow = (followerId: number, followedId: number, status: follow_status): void => {
    follows.push({
      follower_id: followerId,
      followed_id: followedId,
      status,
      created_at: NOW,
      accepted_at: status === 'ACCEPTED' ? NOW : null,
    });
  };

  // A Discoverable rider with a name, one call.
  const seedRider = (id: number, name: string | null, handle: string, visibility = profile_visibility.PUBLIC): void => {
    seedUser(id, name);
    seedProfile(id, handle, visibility);
  };

  describe('search - who is found', () => {
    beforeEach(() => {
      seedRider(10, 'Jana Malá', 'janicka');
      seedRider(11, 'Tomáš Hájek', 'tomas_h', profile_visibility.FOLLOWERS);
      seedRider(12, 'Veronika Šťastná', 'verca');
      seedRider(13, 'Petr Jasný', 'petr-j');
    });

    it('matches the handle by prefix, whatever the case typed', async () => {
      const lower = await service.search(ME, 'jan');
      const upper = await service.search(ME, 'JAN');

      expect(lower.results.map((row) => row.handle)).toEqual(['janicka']);
      expect(upper).toEqual(lower);
    });

    it('matches any word of the name by prefix, whatever the case', async () => {
      const first = await service.search(ME, 'tom');
      const last = await service.search(ME, 'HÁJ');

      expect(first.results.map((row) => row.handle)).toEqual(['tomas_h']);
      expect(last.results.map((row) => row.handle)).toEqual(['tomas_h']);
    });

    it('a word has to start with the query: the middle of a name is no match', async () => {
      const answer = await service.search(ME, 'ájek');

      expect(answer.results).toEqual([]);
    });

    it('does not unaccent: Šťastná is not found by st', async () => {
      const answer = await service.search(ME, 'st');

      expect(answer.results).toEqual([]);
      expect((await service.search(ME, 'šť')).results.map((row) => row.handle)).toEqual(['verca']);
    });

    it('leaves out an Off profile, an account without one, and the seeker', async () => {
      seedRider(14, 'Jan Vypnutý', 'jan-off', profile_visibility.OFF);
      seedUser(15, 'Jan Bezprofilu');
      seedProfile(ME, 'jan-me', profile_visibility.PUBLIC);

      const answer = await service.search(ME, 'jan');

      expect(answer.results.map((row) => row.handle)).toEqual(['janicka']);
    });

    it('a Followers-only profile is Discoverable', async () => {
      const answer = await service.search(ME, 'tomas');

      expect(answer.results).toHaveLength(1);
      expect(answer.results[0]).toMatchObject({ handle: 'tomas_h', visibility: 'FOLLOWERS' });
    });

    it('someone I follow stays in the results as FOLLOWING, someone I asked as PENDING, the rest NONE', async () => {
      seedRider(17, 'Tomáš Jasný', 'tomik');
      seedFollow(ME, 11, 'ACCEPTED');
      seedFollow(ME, 17, 'PENDING');

      const answer = await service.search(ME, 'tom');

      expect(answer.results.map((row) => [row.handle, row.relation])).toEqual([
        ['tomas_h', 'FOLLOWING'],
        ['tomik', 'PENDING'],
      ]);
      expect((await service.search(ME, 'petr')).results.map((row) => row.relation)).toEqual(['NONE']);
    });

    it('carries exactly handle, name, avatar_url, visibility and relation - nothing private', async () => {
      const answer = await service.search(ME, 'jan');

      expect(answer).toEqual({
        results: [
          {
            handle: 'janicka',
            name: 'Jana Malá',
            avatar_url: 'https://lh3.googleusercontent.com/photo',
            visibility: 'PUBLIC',
            relation: 'NONE',
          },
        ],
        capped: false,
      });
    });

    it('reads a rider with no name as null', async () => {
      seedRider(16, null, 'nameless');

      const answer = await service.search(ME, 'name');

      expect(answer.results[0]).toMatchObject({ handle: 'nameless', name: null });
    });
  });

  describe('search - order and cap', () => {
    // The owner seeded for every test - jaffa, Jarda Novák - is a handle match for "ja" too.
    it('handle matches come first, then name matches, alphabetically by handle inside each', async () => {
      seedRider(20, 'Zdeněk Novák', 'jazdenek');
      seedRider(21, 'Ondřej Jareš', 'ondra');
      seedRider(22, 'Adam Novák', 'jaadam');
      seedRider(23, 'Jaroslav Malý', 'bob');
      seedRider(24, 'Jana Nováková', 'anna');

      const answer = await service.search(ME, 'ja');

      expect(answer.results.map((row) => row.handle)).toEqual(['jaadam', 'jaffa', 'jazdenek', 'anna', 'bob', 'ondra']);
    });

    it('a rider matched by both handle and name is listed once, among the handle matches', async () => {
      seedRider(20, 'Jana Malá', 'jana');
      seedRider(21, 'Petr Jasný', 'petr');

      const answer = await service.search(ME, 'ja');

      expect(answer.results.map((row) => row.handle)).toEqual(['jaffa', 'jana', 'petr']);
    });

    it('21 matches answer the first 20 and capped', async () => {
      for (let n = 1; n <= 21; n++) seedRider(100 + n, `Rider ${String(n)}`, `rider${String(n).padStart(2, '0')}`);

      const answer = await service.search(ME, 'rider');

      expect(answer.results).toHaveLength(20);
      expect(answer.results[0].handle).toBe('rider01');
      expect(answer.results[19].handle).toBe('rider20');
      expect(answer.capped).toBe(true);
    });

    it('20 matches answer all 20 and not capped', async () => {
      for (let n = 1; n <= 20; n++) seedRider(100 + n, `Rider ${String(n)}`, `rider${String(n).padStart(2, '0')}`);

      const answer = await service.search(ME, 'rider');

      expect(answer.results).toHaveLength(20);
      expect(answer.capped).toBe(false);
    });

    it('the cap counts handle and name matches together', async () => {
      for (let n = 1; n <= 12; n++) seedRider(100 + n, `Someone ${String(n)}`, `ri${String(n).padStart(2, '0')}`);
      for (let n = 1; n <= 9; n++) seedRider(200 + n, `Rider ${String(n)}`, `x${String(n).padStart(2, '0')}`);

      const answer = await service.search(ME, 'ri');

      expect(answer.results).toHaveLength(20);
      expect(answer.results.slice(0, 12).every((row) => row.handle.startsWith('ri'))).toBe(true);
      expect(answer.capped).toBe(true);
    });
  });

  describe('search - the query', () => {
    it('one character answers 400, trimmed first', async () => {
      await expect(service.search(ME, 'j')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.search(ME, '  j  ')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.search(ME, '')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('51 characters answer 400, 50 do not', async () => {
      await expect(service.search(ME, 'a'.repeat(51))).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.search(ME, 'a'.repeat(50))).resolves.toEqual({ results: [], capped: false });
    });

    it('surrounding whitespace is not part of the query', async () => {
      seedRider(10, 'Jana Malá', 'janicka');

      const answer = await service.search(ME, '  jan ');

      expect(answer.results.map((row) => row.handle)).toEqual(['janicka']);
    });
  });

  describe('following', () => {
    it('is empty with no row', async () => {
      await expect(service.following(ME)).resolves.toEqual([]);
    });

    it('lists whom I follow and whom I asked, ordered by name then handle', async () => {
      seedRider(10, 'Zuzana Veselá', 'zuzka');
      seedRider(11, 'Adam Novák', 'adam-b', profile_visibility.FOLLOWERS);
      seedRider(12, 'Adam Novák', 'adam-a');
      seedFollow(ME, 10, 'ACCEPTED');
      seedFollow(ME, 11, 'PENDING');
      seedFollow(ME, 12, 'ACCEPTED');

      const rows = await service.following(ME);

      expect(rows.map((row) => [row.handle, row.relation])).toEqual([
        ['adam-a', 'FOLLOWING'],
        ['adam-b', 'PENDING'],
        ['zuzka', 'FOLLOWING'],
      ]);
    });

    it('carries the current handle after a rename, and the current visibility', async () => {
      seedRider(10, 'Jana Malá', 'janicka');
      seedFollow(ME, 10, 'ACCEPTED');
      seedProfile(10, 'jana-nova', profile_visibility.OFF);

      const rows = await service.following(ME);

      expect(rows).toEqual([
        {
          handle: 'jana-nova',
          name: 'Jana Malá',
          avatar_url: 'https://lh3.googleusercontent.com/photo',
          visibility: 'OFF',
          relation: 'FOLLOWING',
        },
      ]);
    });

    it('is my outgoing side only: who follows me is not in it', async () => {
      seedRider(10, 'Jana Malá', 'janicka');
      seedProfile(ME, 'petr', profile_visibility.PUBLIC);
      seedFollow(10, ME, 'ACCEPTED');

      await expect(service.following(ME)).resolves.toEqual([]);
    });

    it('a rider with no name sorts last', async () => {
      seedRider(10, null, 'aaa');
      seedRider(11, 'Zuzana Veselá', 'zzz');
      seedFollow(ME, 10, 'ACCEPTED');
      seedFollow(ME, 11, 'ACCEPTED');

      const rows = await service.following(ME);

      expect(rows.map((row) => row.handle)).toEqual(['zzz', 'aaa']);
    });
  });

  // The owner's side. Every test here reads the owner as the one being asked or followed;
  // the counterpart is keyed by user id, since a follower may have no handle at all.
  describe('followers', () => {
    it('is empty with no row', async () => {
      await expect(service.followers(OWNER_ID)).resolves.toEqual([]);
    });

    it('lists who asked me and who follows me, each with their status, ordered by name then handle', async () => {
      seedRider(10, 'Zuzana Veselá', 'zuzka');
      seedRider(11, 'Adam Novák', 'adam-b');
      seedRider(12, 'Adam Novák', 'adam-a');
      seedFollow(10, OWNER_ID, 'PENDING');
      seedFollow(11, OWNER_ID, 'ACCEPTED');
      seedFollow(12, OWNER_ID, 'PENDING');

      const rows = await service.followers(OWNER_ID);

      expect(rows.map((row) => [row.user_id, row.status])).toEqual([
        [12, 'PENDING'],
        [11, 'ACCEPTED'],
        [10, 'PENDING'],
      ]);
    });

    it('carries the user id, the current handle, the name, the picture and when they came - nothing private', async () => {
      seedRider(10, 'Jana Malá', 'janicka');
      seedFollow(10, OWNER_ID, 'ACCEPTED');
      seedProfile(10, 'jana-nova', profile_visibility.OFF);

      const rows = await service.followers(OWNER_ID);

      expect(rows).toEqual([
        {
          user_id: 10,
          handle: 'jana-nova',
          name: 'Jana Malá',
          avatar_url: 'https://lh3.googleusercontent.com/photo',
          status: 'ACCEPTED',
          created_at: NOW.toISOString(),
        },
      ]);
    });

    it('a follower who never made a profile has handle null and keeps their row', async () => {
      seedUser(10, 'Bez Profilu');
      seedFollow(10, OWNER_ID, 'PENDING');

      const rows = await service.followers(OWNER_ID);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ user_id: 10, handle: null, name: 'Bez Profilu', status: 'PENDING' });
    });

    it('is my incoming side only: whom I follow is not in it', async () => {
      seedRider(10, 'Jana Malá', 'janicka');
      seedFollow(OWNER_ID, 10, 'ACCEPTED');

      await expect(service.followers(OWNER_ID)).resolves.toEqual([]);
    });

    it('reads the same with my profile Off', async () => {
      seedRider(10, 'Jana Malá', 'janicka');
      seedFollow(10, OWNER_ID, 'ACCEPTED');
      seedProfile(OWNER_ID, 'jaffa', profile_visibility.OFF);

      expect(await service.followers(OWNER_ID)).toHaveLength(1);
    });
  });

  describe('accept', () => {
    beforeEach(async () => {
      seedProfile(OWNER_ID, 'jaffa', profile_visibility.FOLLOWERS);
      await service.follow(ME, 'jaffa');
      mockNotifications.create.mockClear();
    });

    it('turns the request into a follow, accepted now, so the garage opens to them', async () => {
      await service.accept(OWNER_ID, ME);

      expect(follows).toHaveLength(1);
      expect(follows[0]).toMatchObject({ follower_id: ME, followed_id: OWNER_ID, status: 'ACCEPTED' });
      expect(follows[0].accepted_at).toBeInstanceOf(Date);
      expect((await service.followers(OWNER_ID))[0].status).toBe('ACCEPTED');
    });

    it('tells the requester once: follow_accepted keyed on the owner, whose garage it names', async () => {
      await service.accept(OWNER_ID, ME);

      expect(mockNotifications.create).toHaveBeenCalledTimes(1);
      expect(mockNotifications.create).toHaveBeenCalledWith({
        userId: ME,
        type: 'follow_accepted',
        dedupKey: `follow_accepted:${String(OWNER_ID)}`,
        payload: { handle: 'jaffa', personName: 'Jarda Novák' },
      });
    });

    it('names an owner without a name by handle alone', async () => {
      seedUser(OWNER_ID, null);

      await service.accept(OWNER_ID, ME);

      expect(mockNotifications.create).toHaveBeenCalledWith(expect.objectContaining({ payload: { handle: 'jaffa' } }));
    });

    it("resolves the owner's ask, so the badge drops", async () => {
      await service.accept(OWNER_ID, ME);

      expect(mockNotifications.resolveByDedupKey).toHaveBeenCalledTimes(1);
      expect(mockNotifications.resolveByDedupKey).toHaveBeenCalledWith(OWNER_ID, `follow_request:${String(ME)}`);
    });

    it('with no row answers 404 and touches nothing', async () => {
      await expect(service.accept(OWNER_ID, 9)).rejects.toBeInstanceOf(NotFoundException);

      expect(follows).toHaveLength(1);
      expect(follows[0].status).toBe('PENDING');
      expect(mockNotifications.create).not.toHaveBeenCalled();
      expect(mockNotifications.resolveByDedupKey).not.toHaveBeenCalled();
    });

    it('a second accept finds no request and answers 404, telling nobody again', async () => {
      await service.accept(OWNER_ID, ME);
      mockNotifications.create.mockClear();
      mockNotifications.resolveByDedupKey.mockClear();

      await expect(service.accept(OWNER_ID, ME)).rejects.toBeInstanceOf(NotFoundException);

      expect(follows[0].status).toBe('ACCEPTED');
      expect(mockNotifications.create).not.toHaveBeenCalled();
      expect(mockNotifications.resolveByDedupKey).not.toHaveBeenCalled();
    });

    it("is the owner's alone: the request cannot be accepted from the other side", async () => {
      await expect(service.accept(ME, OWNER_ID)).rejects.toBeInstanceOf(NotFoundException);

      expect(follows[0].status).toBe('PENDING');
    });

    it('works with the profile Off: the row reads once the profile is back on', async () => {
      seedProfile(OWNER_ID, 'jaffa', profile_visibility.OFF);

      await service.accept(OWNER_ID, ME);

      expect(follows[0].status).toBe('ACCEPTED');
      expect(mockNotifications.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'follow_accepted' }));
    });
  });

  describe('decline - a waiting request', () => {
    beforeEach(async () => {
      seedProfile(OWNER_ID, 'jaffa', profile_visibility.FOLLOWERS);
      await service.follow(ME, 'jaffa');
      mockNotifications.create.mockClear();
    });

    it('removes the row and resolves my ask, so the badge drops', async () => {
      await service.removeFollower(OWNER_ID, ME);

      expect(follows).toHaveLength(0);
      expect(mockNotifications.resolveByDedupKey).toHaveBeenCalledTimes(1);
      expect(mockNotifications.resolveByDedupKey).toHaveBeenCalledWith(OWNER_ID, `follow_request:${String(ME)}`);
    });

    it('tells nobody', async () => {
      await service.removeFollower(OWNER_ID, ME);

      expect(mockNotifications.create).not.toHaveBeenCalled();
    });

    it('the same person can ask again, silently under the same key', async () => {
      await service.removeFollower(OWNER_ID, ME);

      const answer = await service.follow(ME, 'jaffa');

      expect(answer).toEqual({ relation: 'PENDING' });
      expect(follows).toHaveLength(1);
      expect(mockNotifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'follow_request', dedupKey: `follow_request:${String(ME)}` }),
      );
    });

    it("removes this asker's row only", async () => {
      seedUser(9, 'Third');
      await service.follow(9, 'jaffa');

      await service.removeFollower(OWNER_ID, ME);

      expect(follows.map((row) => row.follower_id)).toEqual([9]);
      expect(mockNotifications.resolveByDedupKey).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove - an accepted follower', () => {
    beforeEach(async () => {
      await service.follow(ME, 'jaffa');
      mockNotifications.create.mockClear();
    });

    it('removes the row, tells nobody and resolves nothing - there was no ask', async () => {
      await service.removeFollower(OWNER_ID, ME);

      expect(follows).toHaveLength(0);
      expect(mockNotifications.create).not.toHaveBeenCalled();
      expect(mockNotifications.resolveByDedupKey).not.toHaveBeenCalled();
    });

    it('on a Followers-only profile too: the next open is the locked panel', async () => {
      seedProfile(OWNER_ID, 'jaffa', profile_visibility.FOLLOWERS);

      await service.removeFollower(OWNER_ID, ME);

      expect(follows).toHaveLength(0);
      expect(await service.followers(OWNER_ID)).toEqual([]);
    });

    it('works with the profile Off', async () => {
      seedProfile(OWNER_ID, 'jaffa', profile_visibility.OFF);

      await service.removeFollower(OWNER_ID, ME);

      expect(follows).toHaveLength(0);
    });

    it('with no row: resolves and touches nothing', async () => {
      await service.removeFollower(OWNER_ID, ME);
      mockNotifications.resolveByDedupKey.mockClear();

      await expect(service.removeFollower(OWNER_ID, ME)).resolves.toBeUndefined();
      await expect(service.removeFollower(OWNER_ID, 9)).resolves.toBeUndefined();

      expect(mockNotifications.create).not.toHaveBeenCalled();
      expect(mockNotifications.resolveByDedupKey).not.toHaveBeenCalled();
    });

    it("is the owner's alone: whom I follow is not removed from here", async () => {
      await expect(service.removeFollower(ME, OWNER_ID)).resolves.toBeUndefined();

      expect(follows).toHaveLength(1);
    });

    it('the same person can follow again', async () => {
      await service.removeFollower(OWNER_ID, ME);

      const answer = await service.follow(ME, 'jaffa');

      expect(answer).toEqual({ relation: 'FOLLOWING' });
      expect(follows).toHaveLength(1);
    });
  });
});
