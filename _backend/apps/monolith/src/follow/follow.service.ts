import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { follow_status, Prisma, public_profiles } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/notification-types.config';
import { FollowRelation, ResponseFollowDto } from './dto/response-follow.dto';
import { FollowerRowDto } from './dto/response-follower.dto';
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

// Who may be found at all: a Discoverable profile that is not the seeker's own, nor one
// a query before already found.
function discoverable(seekerId: number, alreadyFound: number[] = []): Prisma.public_profilesWhereInput {
  return { visibility: { in: ['FOLLOWERS', 'PUBLIC'] }, user_id: { notIn: [seekerId, ...alreadyFound] } };
}

// One row per pair, keyed as the unique index is.
function pair(followerId: number, followedId: number): Prisma.followsWhereUniqueInput {
  return { follower_id_followed_id: { follower_id: followerId, followed_id: followedId } };
}

// P2002: two POSTs for one pair raced and the read before the write lost.
function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

// What a row that stands means from the follower's side.
function standing(status: follow_status): FollowRelation {
  return status === 'ACCEPTED' ? 'FOLLOWING' : 'PENDING';
}

function relationOf(status: follow_status | undefined): FollowingRowRelation {
  return status === undefined ? 'NONE' : standing(status);
}

// What one side is told of the other: a follow that took or an ask still waiting go to the
// owner, an accepted ask goes back to the asker.
type FollowNotice = Extract<NotificationType, 'new_follower' | 'follow_request' | 'follow_accepted'>;

// One key per counterpart and notice, the same at creation and at resolve, so the badge
// drops for the right asker.
function noticeKey(type: FollowNotice, counterpartId: number): string {
  return `${type}:${String(counterpartId)}`;
}

// What the owner reads of a follower, under the row: the account's name and picture, and
// the handle if they ever made a profile. The select is what keeps the private fields out.
const followerSelect = {
  follower_id: true,
  status: true,
  created_at: true,
  follower: { select: { name: true, avatar_url: true, public_profile: { select: { handle: true } } } },
} satisfies Prisma.followsSelect;

type FollowerHit = Prisma.followsGetPayload<{ select: typeof followerSelect }>;

const NO_REQUEST = 'No request from this user is waiting';

@Injectable()
export class FollowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // Follow somebody by their Handle. A Public profile takes at once, a Followers-only one
  // takes a Follow Request; a row that already stands is left as it is and answered.
  async follow(followerId: number, rawHandle: string): Promise<ResponseFollowDto> {
    const profile = await this.profileOf(rawHandle);
    if (!profile) throw new NotFoundException(PROFILE_UNAVAILABLE);
    if (profile.user_id === followerId) throw new BadRequestException(CANNOT_FOLLOW_SELF);
    if (profile.visibility === 'OFF') throw new NotFoundException(PROFILE_UNAVAILABLE);

    const existing = await this.prisma.follows.findUnique({ where: pair(followerId, profile.user_id) });
    if (existing) return { relation: standing(existing.status) };

    const status: follow_status = profile.visibility === 'PUBLIC' ? 'ACCEPTED' : 'PENDING';
    const created = await this.createRow(followerId, profile.user_id, status);
    if (!created) return await this.lostRace(followerId, profile.user_id, status);
    await this.tell(profile.user_id, status === 'ACCEPTED' ? 'new_follower' : 'follow_request', followerId);

    return { relation: standing(status) };
  }

  // Two POSTs at once both pass the read; the unique index breaks the tie. False for the loser.
  private async createRow(followerId: number, followedId: number, status: follow_status): Promise<boolean> {
    const now = new Date();
    try {
      await this.prisma.follows.create({
        data: {
          follower_id: followerId,
          followed_id: followedId,
          status,
          created_at: now,
          accepted_at: status === 'ACCEPTED' ? now : null,
        },
      });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }

  // The loser answers the winner's row and tells nobody - the winner did. Gone again
  // already: what this call would have written.
  private async lostRace(followerId: number, followedId: number, status: follow_status): Promise<ResponseFollowDto> {
    const theirs = await this.prisma.follows.findUnique({ where: pair(followerId, followedId) });
    return { relation: standing(theirs?.status ?? status) };
  }

  // Withdraw a request or stop following. Nobody is told; a withdrawn request only takes
  // the owner's ask off their badge. No row and an unknown handle end the same way.
  async unfollow(followerId: number, rawHandle: string): Promise<void> {
    const profile = await this.profileOf(rawHandle);
    if (!profile) return;

    await this.dropRow(followerId, profile.user_id);
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

  // Any word of the name starts with the query - no unaccent, so "st" never finds Šťastná.
  // Whoever the handle already found is left out; only the page's remaining room is read.
  private async searchByName(seekerId: number, query: string, found: SearchHit[]): Promise<SearchHit[]> {
    const room = SEARCH_PAGE + 1 - found.length;
    if (room <= 0) return [];

    const foundIds = found.map((hit) => hit.user_id);
    return await this.prisma.public_profiles.findMany({
      where: {
        ...discoverable(seekerId, foundIds),
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

  // ---------- Who follows me ----------

  // Who asked me and who follows me, one list, each as they are now. The follower is keyed
  // by user id: they may have no handle to be named by.
  async followers(ownerId: number): Promise<FollowerRowDto[]> {
    const rows = await this.prisma.follows.findMany({
      where: { followed_id: ownerId },
      orderBy: [{ follower: { name: 'asc' } }, { follower: { public_profile: { handle: 'asc' } } }],
      select: followerSelect,
    });
    return rows.map(toFollowerRow);
  }

  // Accept a request. Only a request still waiting can be accepted.
  async accept(ownerId: number, followerId: number): Promise<void> {
    const existing = await this.prisma.follows.findUnique({ where: pair(followerId, ownerId) });
    if (!existing || existing.status !== 'PENDING') throw new NotFoundException(NO_REQUEST);

    await this.acceptRequest(ownerId, followerId);
  }

  // The profile turned Public: nobody should wait on a door that is now open, so every
  // request still waiting is accepted as the owner would have, one by one.
  async acceptAllPending(ownerId: number): Promise<void> {
    const waiting = await this.prisma.follows.findMany({
      where: { followed_id: ownerId, status: 'PENDING' },
      select: { follower_id: true },
    });
    for (const row of waiting) {
      await this.acceptRequest(ownerId, row.follower_id);
    }
  }

  // The row turns into a follow now, the asker is told their garage is open, my own ask
  // comes off the badge.
  private async acceptRequest(ownerId: number, followerId: number): Promise<void> {
    await this.prisma.follows.update({
      where: pair(followerId, ownerId),
      data: { status: 'ACCEPTED', accepted_at: new Date() },
    });
    await this.tell(followerId, 'follow_accepted', ownerId);
    await this.notificationService.resolveByDedupKey(ownerId, noticeKey('follow_request', followerId));
  }

  // Decline a request or remove a follower. Nobody is told either way; a declined ask only
  // comes off my badge. No row ends the same way.
  async removeFollower(ownerId: number, followerId: number): Promise<void> {
    await this.dropRow(followerId, ownerId);
  }

  // Either side ends the pair the same way: the row goes, and an ask still waiting comes off
  // the owner's badge - nobody is told.
  private async dropRow(followerId: number, ownerId: number): Promise<void> {
    const existing = await this.prisma.follows.findUnique({ where: pair(followerId, ownerId) });
    if (!existing) return;

    await this.prisma.follows.deleteMany({ where: { follower_id: followerId, followed_id: ownerId } });
    if (existing.status === 'PENDING') {
      await this.notificationService.resolveByDedupKey(ownerId, noticeKey('follow_request', followerId));
    }
  }

  private async profileOf(rawHandle: string): Promise<public_profiles | null> {
    const handle = rawHandle.trim().toLowerCase();
    return await this.prisma.public_profiles.findUnique({ where: { handle } });
  }

  // One notice per pair ever (the dedup key). The counterpart is named as the app names
  // people: handle only with a profile, name only when the account has one.
  private async tell(recipientId: number, type: FollowNotice, counterpartId: number): Promise<void> {
    const person = await this.prisma.users.findUnique({
      where: { id: counterpartId },
      select: { name: true, public_profile: { select: { handle: true } } },
    });

    await this.notificationService.create({
      userId: recipientId,
      type,
      dedupKey: noticeKey(type, counterpartId),
      payload: {
        ...(person?.public_profile && { handle: person.public_profile.handle }),
        ...(person?.name && { personName: person.name }),
      },
    });
  }
}

// An incoming row, field by field: the select read only these, and nothing else is copied.
function toFollowerRow(hit: FollowerHit): FollowerRowDto {
  return {
    user_id: hit.follower_id,
    handle: hit.follower.public_profile?.handle ?? null,
    name: hit.follower.name,
    avatar_url: hit.follower.avatar_url,
    status: hit.status,
    created_at: hit.created_at.toISOString(),
  };
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
