import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, public_profiles, setup_profiles } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { publicAppOrigin } from '../_config/public-app-origin';
import { RESERVED_HANDLES } from './reserved-handles';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ResponseProfileDto } from './dto/response-profile.dto';
import {
  ProfileBikeCardDto,
  ProfileGarageDto,
  ProfileRelation,
  ResponseProfileGarageDto,
} from './dto/response-profile-garage.dto';
import {
  ProfileCatalogueNameDto,
  ProfileComponentGroupDto,
  ProfileHistoryDto,
  ProfileLegDto,
  ProfileMountedPartDto,
  ProfileServiceDto,
  ProfileSetupProfileDto,
  ResponseProfileBikeDto,
  ResponseProfileServicesDto,
} from './dto/response-profile-bike.dto';

// The handle rule ^[a-z0-9][a-z0-9_-]{2,29}$, checked piece by piece so a refusal can say why.
const HANDLE_MIN_LENGTH = 3;
const HANDLE_MAX_LENGTH = 30;
const HANDLE_CHARS = /^[a-z0-9_-]+$/;
const HANDLE_START = /^[a-z0-9]/;

// What a name slugs to when nothing usable is left of it.
const FALLBACK_HANDLE = 'rider';

// Off, no row and a dead handle all answer with this, so a handle cannot be probed for
// which of the three it is.
const PROFILE_UNAVAILABLE = 'This profile is not available';

const FALLBACK_CURRENCY = 'CZK';

// What a garage card is built from: the type label, and of the parts and Services only
// the timestamps - the page counts them and takes the newest, nothing else travels.
const garageBikeInclude = {
  bike_types: { select: { type: true, i18n_key: true } },
  components_mounted: { where: { is_active: true, is_deleted: { not: true } }, select: { updated_at: true } },
  events_bikes: { where: { is_deleted: { not: true } }, select: { updated_at: true } },
} satisfies Prisma.bikesInclude;

type GarageBike = Prisma.bikesGetPayload<{ include: typeof garageBikeInclude }>;

// A mounted part with the kind of part it is and the category that kind sits in.
const mountedPartInclude = {
  component_types: { include: { component_groups: true } },
} satisfies Prisma.components_mountedInclude;

type MountedPart = Prisma.components_mountedGetPayload<{ include: typeof mountedPartInclude }>;

// A Service as a reader may know it, selected rather than included: the note, the
// actions' notes and prices and the attachments are never even fetched.
const serviceSelect = {
  id: true,
  service_date: true,
  total_cost: true,
  event_actions_done: {
    orderBy: { id: 'asc' },
    select: {
      part_replaced: true,
      events_action: { select: { action_name: true, i18n_key: true } },
      action_done_component_map: {
        select: {
          components_mounted: { select: { component_types: { select: { component_type: true, i18n_key: true } } } },
        },
      },
    },
  },
} satisfies Prisma.events_bikesSelect;

type ServiceRow = Prisma.events_bikesGetPayload<{ select: typeof serviceSelect }>;

// The history's page: what the bike page carries, and the bounds the sub-resource pages
// older Services within - the bike-event history's own.
const DEFAULT_PAGE = 20;
const MAX_PAGE = 100;

// Whether the money goes out, and in what currency when it does. Null keeps every price in.
type Costs = { currency: string } | null;

// A bike the viewer may read through the profile, with the profile that let them.
interface ReadableBike {
  profile: public_profiles;
  relation: ProfileRelation;
  bike: GarageBike;
}

// The seeded kind of part a tyre pressure is dialled into, matched by name like the ride
// sync matches its own kinds; the side is the slot's.
const TIRE_TYPE = 'Tire';
type TireSide = 'front' | 'rear';

// The owner as the page needs them: the name and the app avatar, and the units the
// numbers are written in. Never the email, never the Strava picture.
const ownerSelect = {
  name: true,
  avatar_url: true,
  currency: true,
  tire_pressure_unit: true,
} satisfies Prisma.usersSelect;

type GarageOwner = Prisma.usersGetPayload<{ select: typeof ownerSelect }>;

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

  // ---------- The in-app garage ----------

  // One read rule: PUBLIC opens to anyone, FOLLOWERS to the owner or an accepted follower
  // (the header to everyone else), OFF to the owner alone. No view is counted here.
  async read(rawHandle: string, viewerId: number | null): Promise<ResponseProfileGarageDto> {
    const handle = rawHandle.trim().toLowerCase();
    const profile = await this.prisma.public_profiles.findUnique({ where: { handle } });
    const relation: ProfileRelation = profile !== null && profile.user_id === viewerId ? 'SELF' : 'NONE';
    if (!profile || (profile.visibility === 'OFF' && relation !== 'SELF')) {
      throw new NotFoundException(PROFILE_UNAVAILABLE);
    }

    const owner = await this.prisma.users.findUnique({ where: { id: profile.user_id }, select: ownerSelect });
    const allowed = await this.mayReadGarage(profile, relation, viewerId);

    return {
      owner: { handle: profile.handle, name: owner?.name ?? null, avatar_url: owner?.avatar_url ?? null },
      visibility: profile.visibility,
      relation,
      garage: allowed ? await this.garageOf(profile, owner) : null,
    };
  }

  // ---------- The in-app bike page ----------

  // The same rule as the garage, with no header exception: whatever is not readable - the
  // profile, or a bike that is not this owner's, not shared or archived - is one 404.
  async readBike(rawHandle: string, bikeId: number, viewerId: number | null): Promise<ResponseProfileBikeDto> {
    const { profile, relation, bike } = await this.readableBike(rawHandle, bikeId, viewerId);

    const owner = await this.prisma.users.findUnique({ where: { id: profile.user_id }, select: ownerSelect });
    // Read only what goes out: a section that is off is never even fetched.
    const parts = profile.share_components ? await this.mountedParts(bike.id) : null;
    const profiles = profile.share_setup ? await this.setupProfiles(bike.id) : null;
    const currency = owner?.currency ?? FALLBACK_CURRENCY;
    const history = profile.share_history ? await this.historyOf(bike.id, costsIn(profile, currency)) : null;

    return {
      owner: { handle: profile.handle, name: owner?.name ?? null, avatar_url: owner?.avatar_url ?? null },
      visibility: profile.visibility,
      relation,
      currency,
      tire_pressure_unit: owner?.tire_pressure_unit ?? 'bar',
      bike: {
        ...bikeIdentity(bike, profile),
        time_min: bike.total_time_min ?? 0,
        ebike: bike.ebike,
        frame_material: bike.frame_material,
        has_front_suspension: bike.has_front_suspension,
        has_rear_suspension: bike.has_rear_suspension,
        components: parts === null ? null : groupByCategory(parts),
        setup: profiles === null ? null : activeFirst(profiles, bike).map((row) => toSetupProfile(row, bike, parts)),
        history,
      },
    };
  }

  // Older Services of the bike page, by offset. Reads under the bike's rule; a history the
  // owner keeps in is a resource that is not there, the same 404 as a bike nobody may read.
  async readBikeServices(
    rawHandle: string,
    bikeId: number,
    viewerId: number | null,
    limit: number,
    offset: number,
  ): Promise<ResponseProfileServicesDto> {
    const { profile, bike } = await this.readableBike(rawHandle, bikeId, viewerId);
    if (!profile.share_history) throw new NotFoundException(PROFILE_UNAVAILABLE);

    const owner = await this.prisma.users.findUnique({ where: { id: profile.user_id }, select: ownerSelect });
    const costs = costsIn(profile, owner?.currency ?? FALLBACK_CURRENCY);
    const take = clamp(limit, DEFAULT_PAGE, 1, MAX_PAGE);
    const skip = clamp(offset, 0, 0, Number.MAX_SAFE_INTEGER);

    const [services, total_count] = await Promise.all([
      this.servicesPage(bike.id, take, skip, costs),
      this.prisma.events_bikes.count({ where: serviceFilter(bike.id) }),
    ]);
    return { services, total_count };
  }

  // The profile rule, then the bike: this owner's, shared and in use. One 404 for whatever fails.
  private async readableBike(rawHandle: string, bikeId: number, viewerId: number | null): Promise<ReadableBike> {
    const handle = rawHandle.trim().toLowerCase();
    const profile = await this.prisma.public_profiles.findUnique({ where: { handle } });
    const relation: ProfileRelation = profile !== null && profile.user_id === viewerId ? 'SELF' : 'NONE';
    if (!profile || (profile.visibility === 'OFF' && relation !== 'SELF')) {
      throw new NotFoundException(PROFILE_UNAVAILABLE);
    }
    if (!(await this.mayReadGarage(profile, relation, viewerId))) {
      throw new NotFoundException(PROFILE_UNAVAILABLE);
    }

    const bike = await this.prisma.bikes.findFirst({
      where: { id: bikeId, user_id: profile.user_id, is_deleted: { not: true }, is_shared: true },
      include: garageBikeInclude,
    });
    if (!bike) throw new NotFoundException(PROFILE_UNAVAILABLE);

    return { profile, relation, bike };
  }

  // The build as the Report writes it: what is on the bike now, in the catalogue's order.
  private async mountedParts(bikeId: number): Promise<MountedPart[]> {
    return await this.prisma.components_mounted.findMany({
      where: { bike_id: bikeId, is_active: true, is_deleted: { not: true } },
      orderBy: [{ component_type_id: 'asc' }, { id: 'asc' }],
      include: mountedPartInclude,
    });
  }

  // Every profile of the bike, oldest first as the Setup screen lists them.
  private async setupProfiles(bikeId: number): Promise<setup_profiles[]> {
    return await this.prisma.setup_profiles.findMany({
      where: { bike_id: bikeId },
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
    });
  }

  // The whole record summed up, and its first page. Replacements are counted per part,
  // as the History Totals count them (ADR 0003); the spend is read only when it goes out.
  private async historyOf(bikeId: number, costs: Costs): Promise<ProfileHistoryDto> {
    const where = serviceFilter(bikeId);
    const [services, total, replacements, spend] = await Promise.all([
      this.servicesPage(bikeId, DEFAULT_PAGE, 0, costs),
      this.prisma.events_bikes.count({ where }),
      this.prisma.event_actions_done.count({ where: { part_replaced: true, events_bikes: where } }),
      costs === null ? null : this.spendOf(where),
    ]);

    return {
      totals: {
        services: total,
        replacements,
        ...(costs !== null && spend !== null && { spend: { amount: spend, currency: costs.currency } }),
      },
      services,
      total_count: total,
    };
  }

  // What the record adds up to; a history where nobody wrote a price down has spent zero.
  private async spendOf(where: Prisma.events_bikesWhereInput): Promise<number> {
    const totals = await this.prisma.events_bikes.aggregate({ where, _sum: { total_cost: true } });
    return totals._sum.total_cost === null ? 0 : Number(totals._sum.total_cost);
  }

  // One page, ordered as the owner's history reads: newest Service Date first, the undated
  // last, the id breaking a tie so paging never repeats or skips one.
  private async servicesPage(bikeId: number, take: number, skip: number, costs: Costs): Promise<ProfileServiceDto[]> {
    const rows = await this.prisma.events_bikes.findMany({
      where: serviceFilter(bikeId),
      orderBy: [{ service_date: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
      take,
      skip,
      select: serviceSelect,
    });
    return rows.map((row) => toService(row, costs));
  }

  private async mayReadGarage(
    profile: public_profiles,
    relation: ProfileRelation,
    viewerId: number | null,
  ): Promise<boolean> {
    if (relation === 'SELF' || profile.visibility === 'PUBLIC') return true;
    if (profile.visibility === 'FOLLOWERS' && viewerId !== null) {
      return await this.isAcceptedFollower(profile.user_id, viewerId);
    }
    return false;
  }

  // Nobody follows anyone yet. Follow (PRD 2) replaces the body with a follows query.
  private isAcceptedFollower(_ownerId: number, _viewerId: number): Promise<boolean> {
    return Promise.resolve(false);
  }

  private async garageOf(profile: public_profiles, owner: GarageOwner | null): Promise<ProfileGarageDto> {
    const bikes = await this.prisma.bikes.findMany({
      where: { user_id: profile.user_id, is_deleted: { not: true }, is_shared: true },
      orderBy: { id: 'asc' },
      include: garageBikeInclude,
    });

    return {
      updated_at: lastUpdated(profile, bikes).toISOString(),
      shares: {
        components: profile.share_components,
        setup: profile.share_setup,
        history: profile.share_history,
        costs: profile.share_costs,
      },
      totals: {
        bikes: bikes.length,
        distance_km: sum(bikes.map((bike) => bike.total_km ?? 0)),
        components: profile.share_components ? sum(bikes.map((bike) => bike.components_mounted.length)) : null,
        services: profile.share_history ? sum(bikes.map((bike) => bike.events_bikes.length)) : null,
      },
      currency: owner?.currency ?? FALLBACK_CURRENCY,
      tire_pressure_unit: owner?.tire_pressure_unit ?? 'bar',
      bikes: bikes.map((bike) => toBikeCard(bike, profile)),
    };
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

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

// Last Updated: the newest of the profile, its listed bikes, their mounted parts and their
// Services. The profile row always has one, so there is always an answer.
function lastUpdated(profile: public_profiles, bikes: GarageBike[]): Date {
  const moments = bikes.flatMap((bike) => [
    bike.updated_at,
    ...bike.components_mounted.map((part) => part.updated_at),
    ...bike.events_bikes.map((done) => done.updated_at),
  ]);
  return moments.reduce<Date>(
    (newest, moment) => (moment !== null && moment > newest ? moment : newest),
    profile.updated_at,
  );
}

// What the card and the bike page share: the bike itself and the Services count the history
// switch lets out. The parts count is the card's alone - the page carries the build instead.
function bikeIdentity(bike: GarageBike, profile: public_profiles): Omit<ProfileBikeCardDto, 'components'> {
  return {
    id: bike.id,
    name: bike.bikename,
    brand: bike.bike_brand,
    model: bike.bike_model,
    year: bike.year,
    type: bike.bike_types === null ? null : { i18n_key: bike.bike_types.i18n_key, name: bike.bike_types.type ?? '' },
    image_url: bike.image_url,
    distance_km: bike.total_km ?? 0,
    services: profile.share_history ? bike.events_bikes.length : null,
  };
}

function toBikeCard(bike: GarageBike, profile: public_profiles): ProfileBikeCardDto {
  return {
    ...bikeIdentity(bike, profile),
    components: profile.share_components ? bike.components_mounted.length : null,
  };
}

// Only what a reader may know of a part: never its note, never its health index.
function toMountedPart(part: MountedPart): ProfileMountedPartDto {
  return {
    id: part.id,
    type: { i18n_key: part.component_types.i18n_key, name: part.component_types.component_type },
    description: part.component_desc,
    position: part.position,
    distance_km: part.total_km,
    time_min: part.total_time_min,
  };
}

// The build by Component Category, in the order the parts arrive; a category with nothing
// on the bike is not a category of this bike.
function groupByCategory(parts: MountedPart[]): ProfileComponentGroupDto[] {
  const groups = new Map<number, ProfileComponentGroupDto>();
  for (const part of parts) {
    const category = part.component_types.component_groups;
    const group = groups.get(category.id) ?? {
      category: { i18n_key: category.i18n_key, name: category.group_name },
      parts: [],
    };
    group.parts.push(toMountedPart(part));
    groups.set(category.id, group);
  }
  return [...groups.values()];
}

// The tyre in the slot, by side. Null with components off (nothing was read) or an empty slot.
function mountedTire(parts: MountedPart[] | null, side: TireSide): ProfileMountedPartDto | null {
  const tire = parts?.find(
    (part) => part.component_types.component_type === TIRE_TYPE && part.position?.toLowerCase() === side,
  );
  return tire === undefined ? null : toMountedPart(tire);
}

function toNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : Number(value);
}

// One leg of the sheet, read off the row's fork_* or shock_* columns.
function legOf(row: setup_profiles, leg: 'fork' | 'shock'): ProfileLegDto {
  return {
    pressure_psi: toNumber(row[`${leg}_pressure_psi`]),
    sag_percent: row[`${leg}_sag_percent`],
    tokens: row[`${leg}_tokens`],
    clicks: {
      rebound_ls: row[`${leg}_rebound_ls`],
      rebound_hs: row[`${leg}_rebound_hs`],
      compression_ls: row[`${leg}_compression_ls`],
      compression_hs: row[`${leg}_compression_hs`],
    },
  };
}

// The page opens on the profile the bike is ridden at, so it goes first; the rest keep
// the Setup screen's order.
function activeFirst(profiles: setup_profiles[], bike: GarageBike): setup_profiles[] {
  const active = profiles.filter((row) => row.id === bike.active_setup_profile_id);
  const others = profiles.filter((row) => row.id !== bike.active_setup_profile_id);
  return [...active, ...others];
}

// A profile as the page reads it: the six numbers, the legs only per the bike's own
// suspension (ADR 0029), the mounted tyres only when the build goes out. The note stays.
function toSetupProfile(row: setup_profiles, bike: GarageBike, parts: MountedPart[] | null): ProfileSetupProfileDto {
  return {
    id: row.id,
    name: row.name,
    is_active: row.id === bike.active_setup_profile_id,
    front_tire_psi: toNumber(row.front_tire_psi),
    rear_tire_psi: toNumber(row.rear_tire_psi),
    front_tire: mountedTire(parts, 'front'),
    rear_tire: mountedTire(parts, 'rear'),
    fork: bike.has_front_suspension ? legOf(row, 'fork') : null,
    shock: bike.has_rear_suspension ? legOf(row, 'shock') : null,
  };
}

// is_deleted is nullable, so `not: true` covers both false and the rows written before
// the column existed.
function serviceFilter(bikeId: number): Prisma.events_bikesWhereInput {
  return { bike_id: bikeId, is_deleted: { not: true } };
}

function costsIn(profile: public_profiles, currency: string): Costs {
  return profile.share_costs ? { currency } : null;
}

// A page size the caller left out arrives as NaN and takes the default; one pushed too far
// is pulled back into range - the bike-event history's own reading of the query string.
function clamp(value: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), min), max);
}

// The kinds of part a Service touched, each once: two tyres in one Service are one chip.
function partsTouched(row: ServiceRow): ProfileCatalogueNameDto[] {
  const types = new Map<string, ProfileCatalogueNameDto>();
  for (const done of row.event_actions_done) {
    for (const junction of done.action_done_component_map) {
      const type = junction.components_mounted.component_types;
      types.set(type.component_type, { i18n_key: type.i18n_key, name: type.component_type });
    }
  }
  return [...types.values()];
}

// A Service as the page reads it. The note, the actions' notes and prices and the
// attachments were never fetched; the cost joins only with share_costs and a price written down.
function toService(row: ServiceRow, costs: Costs): ProfileServiceDto {
  return {
    id: row.id,
    date: row.service_date?.toISOString() ?? null,
    is_replacement: row.event_actions_done.some((done) => done.part_replaced === true),
    actions: row.event_actions_done.map((done) => ({
      i18n_key: done.events_action.i18n_key,
      name: done.events_action.action_name,
    })),
    parts: partsTouched(row),
    ...(costs !== null &&
      row.total_cost !== null && { cost: { amount: Number(row.total_cost), currency: costs.currency } }),
  };
}
