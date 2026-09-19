import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, setup_profiles } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ownedBikeWhere, ownedBikesWhere } from '../bike/owned-bike.where';
import { CreateSetupProfileDto } from './dto/create-setup-profile.dto';
import { UpdateSetupProfileDto } from './dto/update-setup-profile.dto';
import { Response_SetupProfileDto } from './dto/response-setup-profile.dto';

// What a copy carries over: every number of the sheet and the note. The name is the new profile's own.
const COPIED_FIELDS = [
  'note',
  'front_tire_psi',
  'rear_tire_psi',
  'fork_pressure_psi',
  'fork_tokens',
  'fork_sag_percent',
  'fork_rebound_ls',
  'fork_rebound_hs',
  'fork_compression_ls',
  'fork_compression_hs',
  'shock_pressure_psi',
  'shock_tokens',
  'shock_sag_percent',
  'shock_rebound_ls',
  'shock_rebound_hs',
  'shock_compression_ls',
  'shock_compression_hs',
] as const satisfies readonly (keyof setup_profiles)[];

type CopiedFields = Pick<setup_profiles, (typeof COPIED_FIELDS)[number]>;

// The bike a profile is read or written against: that it is this owner's, whether it is archived,
// and which of its profiles is the active one.
type BikeState = { id: number; is_deleted: boolean | null; active_setup_profile_id: number | null };
const bikeState = { id: true, is_deleted: true, active_setup_profile_id: true } satisfies Prisma.bikesSelect;

// A profile with the state of the bike it hangs off, so one read decides both 404 and 409.
const withBikeState = { bikes: { select: bikeState } } satisfies Prisma.setup_profilesInclude;
type ProfileWithBike = Prisma.setup_profilesGetPayload<{ include: typeof withBikeState }>;

// Setup Profiles: the numbers a bike is ridden at, held on the bike and rewritten in place
// (ADR 0029). Everything here is psi; the screen converts tyres to the owner's Tyre Pressure Unit.
@Injectable()
export class SetupService {
  constructor(private readonly prisma: PrismaService) {}

  // The profiles of one bike, oldest first. An Archived Bike's stay readable. An empty list means
  // nothing has been written down yet - the lazy first profile is the screen's promise, not a row.
  async findByBike(bikeId: number, userId: number): Promise<Response_SetupProfileDto[]> {
    const bike = await this.findOwnedBike(bikeId, userId);

    const profiles = await this.prisma.setup_profiles.findMany({
      where: { bike_id: bikeId },
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
    });
    return profiles.map((profile) => toSetupProfileDto(profile, profile.id === bike.active_setup_profile_id));
  }

  // A new profile: blank, or a copy of another profile of the same bike. The bike's first
  // profile becomes the active one, so a bike with profiles always has one.
  async create(bikeId: number, userId: number, dto: CreateSetupProfileDto): Promise<Response_SetupProfileDto> {
    const bike = await this.findOwnedBike(bikeId, userId);
    assertWritable(bike);
    await this.assertNameFree(bikeId, dto.name);

    const source = dto.copy_of === undefined ? null : await this.findSourceProfile(dto.copy_of, bikeId);
    const profile = await this.prisma.setup_profiles.create({
      data: { bike_id: bikeId, name: dto.name, ...sheetOf(source) },
    });

    const first = bike.active_setup_profile_id === null;
    if (first) await this.setActive(bikeId, profile.id);
    return toSetupProfileDto(profile, first);
  }

  // Makes the profile the one the bike is ridden at; the previous active one simply stops being it.
  async activate(id: number, userId: number): Promise<Response_SetupProfileDto> {
    const profile = await this.findOwnedProfile(id, userId);
    assertWritable(profile.bikes);

    await this.setActive(profile.bike_id, id);
    return toSetupProfileDto(profile, true);
  }

  // Rewrites the profile in place: only the fields sent are written, null clears one.
  async update(id: number, userId: number, dto: UpdateSetupProfileDto): Promise<Response_SetupProfileDto> {
    const profile = await this.findOwnedProfile(id, userId);
    assertWritable(profile.bikes);

    if (dto.name !== undefined && dto.name !== profile.name) {
      await this.assertNameFree(profile.bike_id, dto.name);
    }

    const updated = await this.prisma.setup_profiles.update({ where: { id }, data: dto });
    return toSetupProfileDto(updated, id === profile.bikes.active_setup_profile_id);
  }

  // Deletes any profile, the last one included; the bike then starts over with one. Deleting the
  // active one hands over to its neighbour: the older, else the younger (ADR 0029).
  async delete(id: number, userId: number): Promise<Response_SetupProfileDto> {
    const profile = await this.findOwnedProfile(id, userId);
    assertWritable(profile.bikes);

    const wasActive = id === profile.bikes.active_setup_profile_id;
    if (wasActive) await this.setActive(profile.bike_id, await this.findNeighbourId(profile));

    return toSetupProfileDto(await this.prisma.setup_profiles.delete({ where: { id } }), wasActive);
  }

  private async setActive(bikeId: number, profileId: number | null): Promise<void> {
    await this.prisma.bikes.update({ where: { id: bikeId }, data: { active_setup_profile_id: profileId } });
  }

  // The profile that takes over from this one: the one created just before it, else just after.
  private async findNeighbourId(profile: setup_profiles): Promise<number | null> {
    const siblings = await this.prisma.setup_profiles.findMany({
      where: { bike_id: profile.bike_id },
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    const index = siblings.findIndex((sibling) => sibling.id === profile.id);
    return siblings[index - 1]?.id ?? siblings[index + 1]?.id ?? null;
  }

  // The bike only if it belongs to the user, archived or not; otherwise 404 (no ownership leak).
  private async findOwnedBike(bikeId: number, userId: number): Promise<BikeState> {
    const bike = await this.prisma.bikes.findFirst({
      where: ownedBikeWhere(bikeId, userId, { includeArchived: true }),
      select: bikeState,
    });
    if (!bike) {
      throw new NotFoundException(`Bike with ID ${bikeId} not found`);
    }
    return bike;
  }

  // A profile is only reachable through the owner of the bike carrying it.
  private async findOwnedProfile(id: number, userId: number): Promise<ProfileWithBike> {
    const profile = await this.prisma.setup_profiles.findFirst({
      where: { id, bikes: ownedBikesWhere(userId, { includeArchived: true }) },
      include: withBikeState,
    });
    if (!profile) {
      throw new NotFoundException(`Setup profile with ID ${id} not found`);
    }
    return profile;
  }

  // The profile to copy has to sit on the same bike; another bike's is not found.
  private async findSourceProfile(id: number, bikeId: number): Promise<setup_profiles> {
    const source = await this.prisma.setup_profiles.findFirst({ where: { id, bike_id: bikeId } });
    if (!source) {
      throw new NotFoundException(`Setup profile with ID ${id} not found on bike ${bikeId}`);
    }
    return source;
  }

  // Two profiles on one bike never share a name, so switching between them is unambiguous.
  private async assertNameFree(bikeId: number, name: string): Promise<void> {
    const taken = await this.prisma.setup_profiles.findUnique({
      where: { bike_id_name: { bike_id: bikeId, name } },
      select: { id: true },
    });
    if (taken) {
      throw new ConflictException(`Setup profile "${name}" already exists on this bike`);
    }
  }
}

// An Archived Bike is read-only (ADR 0024): its profiles are read, never written.
function assertWritable(bike: BikeState): void {
  if (bike.is_deleted === true) {
    throw new ConflictException(`Bike with ID ${bike.id} is archived and read-only`);
  }
}

// The sheet a new profile starts with: the source's, or every field null when it starts blank.
function sheetOf(source: setup_profiles | null): CopiedFields {
  return Object.fromEntries(COPIED_FIELDS.map((field) => [field, source ? source[field] : null])) as CopiedFields;
}

// Decimal pressures go out as numbers; everything else mirrors the row.
function toSetupProfileDto(profile: setup_profiles, isActive: boolean): Response_SetupProfileDto {
  return {
    ...profile,
    is_active: isActive,
    front_tire_psi: toNumber(profile.front_tire_psi),
    rear_tire_psi: toNumber(profile.rear_tire_psi),
    fork_pressure_psi: toNumber(profile.fork_pressure_psi),
    shock_pressure_psi: toNumber(profile.shock_pressure_psi),
  };
}

function toNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : Number(value);
}
