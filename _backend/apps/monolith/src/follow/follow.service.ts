import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, public_profiles } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { ResponseFollowDto } from './dto/response-follow.dto';

// Off, no row and a dead handle all answer with this, so a handle cannot be probed for
// which of the three it is - the profile route's own wording.
const PROFILE_UNAVAILABLE = 'This profile is not available';

const CANNOT_FOLLOW_SELF = 'CANNOT_FOLLOW_SELF';

// One row per pair, keyed as the unique index is.
function pair(followerId: number, followedId: number): Prisma.followsWhereUniqueInput {
  return { follower_id_followed_id: { follower_id: followerId, followed_id: followedId } };
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
