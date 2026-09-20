import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma, public_profiles } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { publicAppOrigin } from '../_config/public-app-origin';
import { RESERVED_HANDLES } from './reserved-handles';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ResponseProfileDto } from './dto/response-profile.dto';

// The handle rule ^[a-z0-9][a-z0-9_-]{2,29}$, checked piece by piece so a refusal can say why.
const HANDLE_MIN_LENGTH = 3;
const HANDLE_MAX_LENGTH = 30;
const HANDLE_CHARS = /^[a-z0-9_-]+$/;
const HANDLE_START = /^[a-z0-9]/;

// What a name slugs to when nothing usable is left of it.
const FALLBACK_HANDLE = 'rider';

export type HandleReason =
  | 'HANDLE_TOO_SHORT'
  | 'HANDLE_TOO_LONG'
  | 'HANDLE_INVALID_CHARS'
  | 'HANDLE_LEADING_DASH'
  | 'HANDLE_RESERVED';

// What a PATCH may carry besides the handle.
type ProfileSettings = Partial<
  Pick<public_profiles, 'visibility' | 'share_components' | 'share_setup' | 'share_history' | 'share_costs'>
>;

const OFF_DEFAULTS: Omit<ResponseProfileDto, 'suggested_handle' | 'public_origin'> = {
  handle: null,
  visibility: 'OFF',
  share_components: true,
  share_setup: true,
  share_history: true,
  share_costs: false,
  stats: { views: 0, followers: 0, pending_requests: 0 },
};

// Why a lowercase handle cannot be taken, or null when it can.
export function handleReason(handle: string): HandleReason | null {
  if (handle.length < HANDLE_MIN_LENGTH) return 'HANDLE_TOO_SHORT';
  if (handle.length > HANDLE_MAX_LENGTH) return 'HANDLE_TOO_LONG';
  if (!HANDLE_CHARS.test(handle)) return 'HANDLE_INVALID_CHARS';
  if (!HANDLE_START.test(handle)) return 'HANDLE_LEADING_DASH';
  if (RESERVED_HANDLES.has(handle)) return 'HANDLE_RESERVED';
  return null;
}

// "Jarda Novák" -> "jarda-novak"; null when too little is left to be a handle.
function slugOf(source: string | null | undefined): string | null {
  if (!source) return null;
  const slug = source
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, HANDLE_MAX_LENGTH)
    .replace(/[-_]+$/, '');
  return slug.length >= HANDLE_MIN_LENGTH ? slug : null;
}

// "jarda-novak" + 2 -> "jarda-novak-2", the base trimmed so the suffix still fits.
function withSuffix(base: string, n: number): string {
  const suffix = `-${n}`;
  return `${base.slice(0, HANDLE_MAX_LENGTH - suffix.length)}${suffix}`;
}

// P2002 on the upsert: two accounts raced for one handle and the check before it lost.
function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function settingsOf(dto: UpdateProfileDto): ProfileSettings {
  return {
    ...(dto.visibility !== undefined && { visibility: dto.visibility }),
    ...(dto.share_components !== undefined && { share_components: dto.share_components }),
    ...(dto.share_setup !== undefined && { share_setup: dto.share_setup }),
    ...(dto.share_history !== undefined && { share_history: dto.share_history }),
    ...(dto.share_costs !== undefined && { share_costs: dto.share_costs }),
  };
}

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  // The owner's settings; without a row, the OFF defaults and a suggested handle. Reads only.
  async getMine(userId: number): Promise<ResponseProfileDto> {
    const row = await this.prisma.public_profiles.findUnique({ where: { user_id: userId } });
    if (row) return this.toDto(row);

    return { ...OFF_DEFAULTS, suggested_handle: await this.suggestHandle(userId), public_origin: this.origin() };
  }

  // Upserts any subset. The first confirm has to name a handle; a rename frees the old one at once.
  async updateMine(userId: number, dto: UpdateProfileDto): Promise<ResponseProfileDto> {
    const existing = await this.prisma.public_profiles.findUnique({ where: { user_id: userId } });
    const handle = dto.handle === undefined ? existing?.handle : await this.validHandle(dto.handle, userId);
    if (handle === undefined) {
      throw new BadRequestException('HANDLE_REQUIRED');
    }

    const settings = settingsOf(dto);
    try {
      const row = await this.prisma.public_profiles.upsert({
        where: { user_id: userId },
        create: { user_id: userId, handle, ...settings },
        update: { handle, ...settings },
      });
      return this.toDto(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('HANDLE_TAKEN');
      throw error;
    }
  }

  // Lowercases, applies the rule, and refuses a handle another account holds.
  private async validHandle(raw: string, userId: number): Promise<string> {
    const handle = raw.trim().toLowerCase();
    const reason = handleReason(handle);
    if (reason) throw new BadRequestException(reason);

    const holder = await this.prisma.public_profiles.findUnique({ where: { handle }, select: { user_id: true } });
    if (holder && holder.user_id !== userId) throw new ConflictException('HANDLE_TAKEN');

    return handle;
  }

  // Strava username, else the name, slugged; a numeric suffix when taken or reserved.
  private async suggestHandle(userId: number): Promise<string> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { name: true, strava_username: true },
    });
    const base = slugOf(user?.strava_username) ?? slugOf(user?.name) ?? FALLBACK_HANDLE;

    for (let n = 1; ; n++) {
      const candidate = n === 1 ? base : withSuffix(base, n);
      if (RESERVED_HANDLES.has(candidate)) continue;
      const holder = await this.prisma.public_profiles.findUnique({
        where: { handle: candidate },
        select: { user_id: true },
      });
      if (!holder) return candidate;
    }
  }

  private origin(): string {
    return publicAppOrigin('profile link');
  }

  private toDto(row: public_profiles): ResponseProfileDto {
    return {
      handle: row.handle,
      visibility: row.visibility,
      share_components: row.share_components,
      share_setup: row.share_setup,
      share_history: row.share_history,
      share_costs: row.share_costs,
      stats: { views: row.view_count, followers: 0, pending_requests: 0 },
      suggested_handle: null,
      public_origin: this.origin(),
    };
  }
}
