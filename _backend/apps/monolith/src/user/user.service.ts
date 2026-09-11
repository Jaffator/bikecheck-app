import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountDeletionSummaryDto, CreateUserDto, UpdateUserDto } from './dto/user.dtos';
import bcrypt from 'bcrypt';
import { users as UserFull } from '@prisma/client';
import { LoginGoogleDto } from '../auth/dto/auth.dtos';

// One cost factor for every hash the app writes, so registration and a later password
// change cannot drift apart.
const SALT_ROUNDS = 10;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

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

  async createUserByGoogle(dto: LoginGoogleDto): Promise<UserFull> {
    return this.prisma.users.create({
      data: {
        name: dto.name,
        email: dto.email,
        googleId: dto.googleId,
        avatar_url: dto.avatar_url,
        password_hash: null,
        is_active: true,
        // Google sign-in carries no locale, so the client backfills it on first load.
        language: null,
      },
    });
  }

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
      },
    });
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
    await this.prisma.$transaction(async (tx) => {
      await tx.strava_pending_activities.deleteMany({ where: { user_id: userId } });
      await tx.bikes.deleteMany({ where: { user_id: userId } });
      await tx.users.delete({ where: { id: userId } });
    });
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
}
