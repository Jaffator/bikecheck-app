import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { follow_status, Prisma, public_profiles } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { ResponseFollowDto } from './dto/response-follow.dto';
import { FollowingRowDto, FollowingRowRelation, ResponseFollowSearchDto } from './dto/response-following.dto';

// Off, no row and a dead handle all answer with this, so a handle cannot be probed for
// which of the three it is - the profile route's own wording.
const PROFILE_UNAVAILABLE = 'This profile is not available';

const CANNOT_FOLLOW_SELF = 'CANNOT_FOLLOW_SELF';

// A search answers the first page only; one row past it says there was more.
const SEARCH_MIN_LENGTH = 2;
const SEARCH_MAX_LENGTH = 50;
const SEARCH_PAGE = 20;

// A person as a result row is built from: the profile, and of the account only its name
// and picture - the select is what keeps the private fields out.
const searchSelect = {
  user_id: true,
  handle: true,
  visibility: true,
  users: { select: { name: true, avatar_url: true } },
} satisfies Prisma.public_profilesSelect;

type SearchHit = Prisma.public_profilesGetPayload<{ select: typeof searchSelect }>;

// Who may be found at all: a Discoverable profile that is not the seeker's own.
function discoverable(seekerId: number): Prisma.public_profilesWhereInput {
  return { visibility: { in: ['FOLLOWERS', 'PUBLIC'] }, user_id: { not: seekerId } };
}

// One row per pair, keyed as the unique index is.
function pair(followerId: number, followedId: number): Prisma.followsWhereUniqueInput {
  return { follower_id_followed_id: { follower_id: followerId, followed_id: followedId } };
}

function relationOf(status: follow_status | undefined): FollowingRowRelation {
  if (status === undefined) return 'NONE';
  return status === 'ACCEPTED' ? 'FOLLOWING' : 'PENDING';
}

@Injectable()
export class FollowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // Follow somebody by their Handle. A Public profile takes at once; a row that already
  // stands is left as it is and answered, so a second tap changes nothing.
  async follow(followerId: number, rawHandle: string): Promise<ResponseFollowDto> {
    const profile = await this.profileOf(rawHandle);
    if (!profile) throw new NotFoundException(PROFILE_UNAVAILABLE);
    if (profile.user_id === followerId) throw new BadRequestException(CANNOT_FOLLOW_SELF);
    if (profile.visibility === 'OFF') throw new NotFoundException(PROFILE_UNAVAILABLE);

    const existing = await this.prisma.follows.findUnique({ where: pair(followerId, profile.user_id) });
    // ACCEPTED is the only status a row can hold until Follow Requests land (#146).
    if (existing) return { relation: 'FOLLOWING' };

    // A Followers-only profile takes a Follow Request, which is the request slice's (#146).
    if (profile.visibility !== 'PUBLIC') throw new NotFoundException(PROFILE_UNAVAILABLE);

    const now = new Date();
    await this.prisma.follows.create({
      data: {
        follower_id: followerId,
        followed_id: profile.user_id,
        status: 'ACCEPTED',
        created_at: now,
        accepted_at: now,
      },
    });
    await this.tellNewFollower(profile.user_id, followerId);

    return { relation: 'FOLLOWING' };
  }

  // Stop following. No row, an unknown handle and a profile gone Off all end the same way:
  // nothing stands, nobody is told.
  async unfollow(followerId: number, rawHandle: string): Promise<void> {
    const profile = await this.profileOf(rawHandle);
    if (!profile) return;

    await this.prisma.follows.deleteMany({ where: { follower_id: followerId, followed_id: profile.user_id } });
  }

  // ---------- Finding people ----------

  // Discoverable riders by handle prefix or a word of their name - two queries, handle
  // matches first, alphabetical inside each. One row past the page tells whether it was cut.
  async search(seekerId: number, rawQuery: string): Promise<ResponseFollowSearchDto> {
    const query = rawQuery.trim();
    if (query.length < SEARCH_MIN_LENGTH) throw new BadRequestException('QUERY_TOO_SHORT');
    if (query.length > SEARCH_MAX_LENGTH) throw new BadRequestException('QUERY_TOO_LONG');

    const byHandle = await this.prisma.public_profiles.findMany({
      // Handles are stored lowercase, so lowering the query is the case-insensitive match.
      where: { ...discoverable(seekerId), handle: { startsWith: query.toLowerCase() } },
      orderBy: { handle: 'asc' },
      take: SEARCH_PAGE + 1,
      select: searchSelect,
    });
    const byName = await this.searchByName(seekerId, query, byHandle);

    const hits = [...byHandle, ...byName];
    const page = hits.slice(0, SEARCH_PAGE);
    const relations = await this.relationsWith(
      seekerId,
      page.map((hit) => hit.user_id),
    );

    return {
      results: page.map((hit) => toRow(hit, relations.get(hit.user_id))),
      capped: hits.length > SEARCH_PAGE,
    };
  }

  // The name's first word or any later one starts with the query; no unaccent, so "st"
  // never finds Šťastná. Whoever the handle already found is left out, and only as many
  // rows as the page still has room for are read.
  private async searchByName(seekerId: number, query: string, found: SearchHit[]): Promise<SearchHit[]> {
    const room = SEARCH_PAGE + 1 - found.length;
    if (room <= 0) return [];

    return await this.prisma.public_profiles.findMany({
      where: {
        ...discoverable(seekerId),
        user_id: { notIn: [seekerId, ...found.map((hit) => hit.user_id)] },
        users: {
          OR: [
            { name: { startsWith: query, mode: 'insensitive' } },
            { name: { contains: ` ${query}`, mode: 'insensitive' } },
          ],
        },
      },
      orderBy: { handle: 'asc' },
      take: room,
      select: searchSelect,
    });
  }

  // What stands between me and each of these accounts, by their id.
  private async relationsWith(followerId: number, userIds: number[]): Promise<Map<number, follow_status>> {
    if (userIds.length === 0) return new Map();

    const rows = await this.prisma.follows.findMany({
      where: { follower_id: followerId, followed_id: { in: userIds } },
      select: { followed_id: true, status: true },
    });
    return new Map(rows.map((row) => [row.followed_id, row.status]));
  }

  // ---------- Whom I follow ----------

  // Whom I follow and whom I asked, one list, each with the counterpart as they are now -
  // the handle after a rename, the visibility after a switch.
  async following(followerId: number): Promise<FollowingRowDto[]> {
    const rows = await this.prisma.follows.findMany({
      where: { follower_id: followerId },
      orderBy: [{ followed: { name: 'asc' } }, { followed: { public_profile: { handle: 'asc' } } }],
      select: {
        status: true,
        followed: {
          select: { name: true, avatar_url: true, public_profile: { select: { handle: true, visibility: true } } },
        },
      },
    });

    // A row is only ever made through a handle, and a profile outlives every switch, so
    // the counterpart always has one; the type alone says otherwise.
    return rows.flatMap((row) => {
      const profile = row.followed.public_profile;
      if (!profile) return [];
      return [
        {
          handle: profile.handle,
          name: row.followed.name,
          avatar_url: row.followed.avatar_url,
          visibility: profile.visibility,
          relation: relationOf(row.status),
        },
      ];
    });
  }

  private async profileOf(rawHandle: string): Promise<public_profiles | null> {
    const handle = rawHandle.trim().toLowerCase();
    return await this.prisma.public_profiles.findUnique({ where: { handle } });
  }

  // In-app only, once per follower ever (the dedup key). The follower is named as the app
  // names people: handle only with a profile, name only when the account has one.
  private async tellNewFollower(ownerId: number, followerId: number): Promise<void> {
    const follower = await this.prisma.users.findUnique({
      where: { id: followerId },
      select: { name: true, public_profile: { select: { handle: true } } },
    });

    await this.notificationService.create({
      userId: ownerId,
      type: 'new_follower',
      dedupKey: `new_follower:${String(followerId)}`,
      payload: {
        ...(follower?.public_profile && { handle: follower.public_profile.handle }),
        ...(follower?.name && { personName: follower.name }),
      },
    });
  }
}

// A result row, field by field: the select read only these, and nothing else is copied.
function toRow(hit: SearchHit, status: follow_status | undefined): FollowingRowDto {
  return {
    handle: hit.handle,
    name: hit.users.name,
    avatar_url: hit.users.avatar_url,
    visibility: hit.visibility,
    relation: relationOf(status),
  };
}
