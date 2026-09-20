import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountEventsService } from '../account-events/account-events.service';
import { NotificationService } from '../notification/notification.service';
import { AccountDeletionSummaryDto, CreateUserDto, UpdateUserDto } from './dto/user.dtos';
import bcrypt from 'bcrypt';
import { Prisma, users as UserFull } from '@prisma/client';
import { LoginGoogleDto } from '../auth/dto/auth.dtos';

// One cost factor for every hash the app writes, so registration and a later password
// change cannot drift apart.
const SALT_ROUNDS = 10;

// P2025 on a conditional `update` means the row moved on between read and write: a lost race.
function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountEvents: AccountEventsService,
    private readonly notificationService: NotificationService,
  ) {}

  // Returns null when not found — every caller does its own null handling
  // (login -> 401, token refresh -> 401, getMe -> 404, Google -> create user).
  async getUserbyGoogleId(googleid: string): Promise<UserFull | null> {
    return this.prisma.users.findUnique({ where: { googleId: googleid } });
  }

  async getUserbyId(id: number): Promise<UserFull | null> {
    return this.prisma.users.findUnique({ where: { id } });
  }

  async getUserbyEmail(email: string): Promise<UserFull | null> {
    return this.prisma.users.findUnique({ where: { email } });
  }

  // A Google sign-in on an unknown address (ADR 0031). Google's own word decides: a vouched
  // address is born verified, the rare unvouched one is a placeholder like any other, with
  // the Google id on it and the link still to prove it.
  async createUserByGoogle(dto: LoginGoogleDto): Promise<UserFull> {
    const user = await this.prisma.users.create({
      data: {
        name: dto.name,
        email: dto.email,
        googleId: dto.googleId,
        avatar_url: dto.avatar_url,
        password_hash: null,
        is_active: true,
        // Google sign-in carries no locale, so the client backfills it on first load.
        language: null,
        email_verified_at: dto.emailVerified ? new Date() : null,
      },
    });
    // Born verified counts as a rider from day one.
    if (dto.emailVerified) await this.accountEvents.recordVerified();
    return user;
  }

  // A Google id attached to a row that already has the address: a Verified Email met by a
  // vouched sign-in, or a placeholder met by an unvouched one. Nothing else on the row moves.
  async linkGoogleId(id: number, dto: Pick<LoginGoogleDto, 'googleId' | 'avatar_url'>): Promise<UserFull> {
    return this.prisma.users.update({
      where: { id },
      data: { googleId: dto.googleId, avatar_url: dto.avatar_url, updated_at: new Date() },
    });
  }

  // Vouched Google sign-in takes an Unverified Account over outright (ADR 0031). Conditional on
  // the row still being a placeholder: the loser of a concurrent takeover gets null, not a 500.
  async takeOverPlaceholder(id: number, dto: LoginGoogleDto): Promise<UserFull | null> {
    try {
      const user = await this.prisma.users.update({
        where: { id, email_verified_at: null },
        data: {
          googleId: dto.googleId,
          name: dto.name,
          avatar_url: dto.avatar_url,
          password_hash: null,
          email_verified_at: new Date(),
          updated_at: new Date(),
        },
      });
      await this.accountEvents.recordVerified();
      return user;
    } catch (error) {
      if (isRecordNotFound(error)) return null;
      throw error;
    }
  }

  // Registration by name and password (ADR 0031). The address is taken only by a Verified
  // Email; an Unverified Account is a placeholder, and registering over it is simply the
  // first registration again - same row, new name, password and language, and whatever a
  // Google sign-in left on it cleared, because the one registering now is the one who has
  // to prove the address. Either way the row stays unverified; the link does the proving.
  async registerLocal(dto: CreateUserDto): Promise<UserFull> {
    const existingUser = await this.prisma.users.findUnique({ where: { email: dto.email } });
    if (existingUser?.email_verified_at) {
      throw new ConflictException('User with this email already exist');
    }

    const password_hash = await bcrypt.hash(dto.password!, SALT_ROUNDS);
    const profile = {
      name: dto.name,
      avatar_url: null,
      googleId: null,
      password_hash,
      // Sent by the client from the device locale; null means "not chosen yet".
      language: dto.language ?? null,
    };

    if (existingUser) {
      return this.replacePlaceholder(existingUser.id, profile);
    }

    return this.prisma.users.create({
      data: { ...profile, email: dto.email, is_active: true, email_verified_at: null },
    });
  }

  // POST /users/create is not self-registration: any row on the address refuses, a placeholder
  // included, and the new row stays unverified because nothing here sends a Verification Email.
  async createUserLocal(dto: CreateUserDto): Promise<UserFull> {
    const existingUser = await this.prisma.users.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exist');
    }

    const password_hash = await bcrypt.hash(dto.password!, SALT_ROUNDS);

    return this.prisma.users.create({
      data: {
        name: dto.name,
        avatar_url: null,
        email: dto.email,
        googleId: null,
        password_hash,
        is_active: true,
        // Sent by the client from the device locale; null means "not chosen yet".
        language: dto.language ?? null,
        email_verified_at: null,
      },
    });
  }

  // Verifying flips the column once (ADR 0031). The write is conditional on the column still
  // being null, so two links used at once flip it once, and the answer says whether this
  // call was the null -> set transition - the one moment the Welcome Email goes out.
  async verifyEmail(id: number): Promise<boolean> {
    const { count } = await this.prisma.users.updateMany({
      where: { id, email_verified_at: null },
      data: { email_verified_at: new Date(), updated_at: new Date() },
    });
    if (count === 1) await this.accountEvents.recordVerified();
    return count === 1;
  }

  // The plain password is hashed here, never handed in already hashed, so the users table
  // has one place that decides what a stored password looks like.
  async updatePassword(id: number, password: string): Promise<UserFull> {
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    return this.prisma.users.update({
      where: { id },
      data: { password_hash, updated_at: new Date() },
    });
  }

  // What the delete dialog reads out before the rider confirms. Bikes include the archive,
  // because deletion takes those too; services exclude the ones already deleted, because
  // the rider cannot see them either.
  async getAccountDeletionSummary(userId: number): Promise<AccountDeletionSummaryDto> {
    const [bikes, rides, services, publicReports] = await Promise.all([
      this.prisma.bikes.count({ where: { user_id: userId } }),
      this.prisma.rides.count({ where: { user_id: userId, is_deleted: { not: true } } }),
      this.prisma.events_bikes.count({ where: { bikes: { user_id: userId }, is_deleted: { not: true } } }),
      this.prisma.reports.count({ where: { user_id: userId, is_public: true, revoked: false } }),
    ]);

    return { bikes, rides, services, publicReports };
  }

  // Deleting an Account: the row goes and everything hanging off it goes with it. No
  // archive and no soft delete - see ADR 0028.
  //
  // The bikes are deleted first, and by hand. Every relation on `users` cascades, but two
  // of them reach the same rows by different paths: a rider's own component types and
  // their own actions cascade straight from `users`, while the parts and services naming
  // them cascade through `bikes`. Postgres fires those in an order nothing here decides,
  // and `components_mounted -> component_types` is ON DELETE RESTRICT, so the wrong order
  // aborts the delete. Emptying the bikes first leaves no order to get wrong.
  //
  // `strava_pending_activities` carries a user_id with no foreign key behind it, so no
  // cascade would ever reach it. It is cleared here rather than left as the rider's data
  // outliving the rider.
  async deleteAccount(userId: number): Promise<void> {
    const owners = await this.prisma.$transaction(async (tx) => {
      // The one thing kept: that a rider left, and after how long. Read before the row goes.
      const user = await tx.users.findUnique({ where: { id: userId }, select: { email_verified_at: true } });
      // The cascade takes my requests, but each owner's `follow_request` badge is theirs and
      // would stay lit for an account that is gone. Read here, while the rows still exist.
      const waiting = await tx.follows.findMany({
        where: { follower_id: userId, status: 'PENDING' },
        select: { followed_id: true },
      });
      await tx.strava_pending_activities.deleteMany({ where: { user_id: userId } });
      await tx.bikes.deleteMany({ where: { user_id: userId } });
      await tx.users.delete({ where: { id: userId } });
      if (user?.email_verified_at) await this.accountEvents.recordDeleted(user.email_verified_at, tx);
      return waiting.map((row) => row.followed_id);
    });
    // Only once the delete committed: a badge dropped for a delete that rolled back would lie.
    for (const ownerId of owners) {
      await this.notificationService.resolveByDedupKey(ownerId, `follow_request:${String(userId)}`);
    }
  }

  async updateUserProfile(id: number, dto: UpdateUserDto): Promise<UserFull> {
    const user = await this.prisma.users.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const dataFilteredUndefined = Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined));
    return this.prisma.users.update({
      where: { id },
      data: { ...dataFilteredUndefined, updated_at: new Date() },
    });
  }

  // ---- Private methods ----

  // Conditional on the row still being a placeholder: a Google takeover landing between the read
  // and this write made it the owner's Verified Email, so a stranger's password must not follow.
  private async replacePlaceholder(id: number, profile: Prisma.usersUpdateInput): Promise<UserFull> {
    try {
      return await this.prisma.users.update({
        where: { id, email_verified_at: null },
        data: { ...profile, updated_at: new Date() },
      });
    } catch (error) {
      if (isRecordNotFound(error)) throw new ConflictException('User with this email already exist');
      throw error;
    }
  }
}
