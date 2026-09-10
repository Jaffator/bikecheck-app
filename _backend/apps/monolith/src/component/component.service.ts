import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Response_ComponentGroupDto,
  AssembleBikeComponentsDto,
  Response_BikeComponentDto,
  Response_ComponentDto,
  Response_CustomComponentTypeDto,
} from './dto/response-components';
import { CreateBikeComponentDto, CustomComponentsDto } from './dto/create-components';
import { DismountComponentDto, UpdateMountedComponentDto } from './dto/update-components';
import { ownedBikeWhere, OwnedBikeOptions } from '../bike/owned-bike.where';
import { ServiceTrackingService } from '../service-tracking/service-tracking.service';

// What one Mounted Component is read with: the kind of part it is, the category that kind
// sits in, and every occasion work was recorded against it — which is what dates the part
// and what decides whether it has hardened (ADR 0016).
const bikeComponentInclude = {
  component_types: { include: { component_groups: true } },
  action_done_component_map: {
    include: {
      event_actions_done: { include: { events_bikes: { select: { service_date: true, is_deleted: true } } } },
    },
  },
} satisfies Prisma.components_mountedInclude;

type MountedWithRelations = Prisma.components_mountedGetPayload<{ include: typeof bikeComponentInclude }>;

// The seeded Replacement that covers a whole Component Category — the `<Category> Part
// Replacement` catch-all every category has. It is found through the types it already
// targets rather than by templating the category name, because two categories name their
// catch-all differently from themselves (Saddle & Seatpost, E-bike).
async function findCategoryCatchAllReplacement(
  tx: Prisma.TransactionClient,
  componentGroupId: number,
): Promise<{ id: number } | null> {
  return tx.events_action.findFirst({
    where: {
      replace_action: true,
      user_id: null,
      // The category is stored, not derived from the targets (ADR 0022). Every seeded
      // Component Type now owns its Replacement, so a catch-all keeps no seeded target to
      // read a category from - it serves owner-created types alone.
      component_group_id: componentGroupId,
    },
    // The migration picks the same row, so a category that ever grows a second catch-all
    // is answered the same way on both paths.
    orderBy: { id: 'asc' },
    select: { id: true },
  });
}

// The bike's own interval for an Action, kept only where a wear index is part of it. An
// interval without one measures the part in kilometres or hours instead, and says nothing
// about a wear index.
function healthIndexInterval(bikeId: number): Prisma.bike_service_intervalWhereInput {
  return { bike_id: bikeId, health_index_interval: { not: null } };
}

@Injectable()
export class ComponentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly serviceTracking: ServiceTrackingService,
  ) {}

  // The owner is the caller, never whoever the body names. The type also joins its
  // category's catch-all Replacement, so Replace is offered on it like on a seeded one
  // (ADR 0018). Seeded types stopped using the catch-alls in ADR 0022; owner-created ones
  // are all they still serve. One transaction, so a type never half-exists.
  async createComponentType(dto: CustomComponentsDto, userId: number): Promise<Response_ComponentDto> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.component_types.create({
        data: {
          component_type: dto.component_type,
          component_group_id: dto.component_group_id,
          user_id: userId,
          ebike: dto.ebike,
          has_position: dto.has_position,
        },
      });

      const catchAll = await findCategoryCatchAllReplacement(tx, dto.component_group_id);
      // A catalogue with no catch-all for the category leaves the type uncovered rather
      // than refusing to create it: naming a part must never fail on the catalogue.
      if (catchAll !== null) {
        await tx.event_action_targets.create({
          data: { event_action_id: catchAll.id, component_type_id: created.id },
        });
      }

      return created;
    });
  }

  // The catalogue as this owner sees it: everything seeded, plus the types they named
  // themselves. A type another owner created is not theirs to be offered, and one they
  // have removed is offered to nobody (ADR 0021).
  async getComponentsDefaults(ebike: boolean, userId: number): Promise<AssembleBikeComponentsDto[]> {
    const componentTypes = await this.prisma.component_types.findMany({
      where: {
        ...(ebike ? {} : { ebike: false }),
        is_deleted: { not: true },
        OR: [{ user_id: null }, { user_id: userId }],
      },
    });

    // One entry per type — the caller picks the side through has_position,
    // rather than the list carrying a front and a rear row for every part.
    return componentTypes.map((type) => ({
      component: {
        bike_id: 0,
        component_type_id: type.id,
        component_desc: null,
        mounted_at: undefined,
        total_km: 0,
        is_active: true,
        note: null,
        position: undefined,
        interval_id: undefined,
      },
      component_name: type.component_type,
      component_group_id: type.component_group_id,
      component_i18n_key: type.i18n_key,
      has_position: type.has_position,
      essential: type.essential,
    }));
  }

  // The build of one bike: what is on it now and what has come off it, read the way the
  // components section groups it. Soft-deleted rows are not part of either.
  async getBikeComponents(bikeId: number, userId: number): Promise<Response_BikeComponentDto[]> {
    // An Archived Bike's build stays readable; only the writes below refuse it.
    await this.findOwnedBike(bikeId, userId, { includeArchived: true });

    const mounted = await this.prisma.components_mounted.findMany({
      where: { bike_id: bikeId, is_deleted: { not: true } },
      // The same order the Report writes the build in, so the two never read differently.
      orderBy: [{ component_type_id: 'asc' }, { id: 'asc' }],
      include: bikeComponentInclude,
    });

    const watched = await this.healthIndexTypeIds(bikeId);

    return mounted.map((row) => toBikeComponentDto(row, watched.has(row.component_type_id)));
  }

  // A part joins a bike that already exists. It carries the wear it arrived with, so a
  // second-hand fork does not pretend to be new — but no Wear Baseline is written and no
  // Service is created (ADR 0015).
  async createMountedComponent(dto: CreateBikeComponentDto, userId: number): Promise<Response_BikeComponentDto> {
    await this.findOwnedBike(dto.bike_id, userId);

    // One active part per Slot (ADR 0020). The side is part of the key, so a rear caliper
    // still fits a bike that already has a front one, and a part recorded with no side
    // holds only the slot for no side.
    const side = dto.position ?? null;
    const taken = await this.prisma.components_mounted.findFirst({
      where: {
        bike_id: dto.bike_id,
        component_type_id: dto.component_type_id,
        // A side written as Front holds the same slot as one written as front, so the
        // screen and the server never disagree over a row stored before either rule.
        position: side === null ? null : { equals: side, mode: 'insensitive' },
        // Rows predating the default read as still mounted, which is what they are.
        is_active: { not: false },
        is_deleted: { not: true },
      },
      select: { id: true },
    });

    if (taken !== null) {
      throw new ConflictException('This part is already on the bike. Dismount or replace it first.');
    }

    const created = await this.prisma.components_mounted.create({
      data: {
        bike_id: dto.bike_id,
        component_type_id: dto.component_type_id,
        // Everything but the type may be left out: a part can be added in a moment and
        // described later.
        component_desc: dto.component_desc ?? null,
        position: dto.position ?? null,
        note: dto.note ?? null,
        // A part joins the bike the day it is added, unless the caller dates it itself.
        mounted_at: dto.mounted_at ?? new Date(),
        total_km: dto.total_km,
        total_time_min: dto.total_time_min,
      },
      include: bikeComponentInclude,
    });

    return toBikeComponentDto(created, await this.tracksHealthIndex(created.bike_id, created.component_type_id));
  }

  // Correcting a part. Its description and position are always the owner's to fix; its
  // wear and mounted date only while no Service has frozen a Wear Baseline against them
  // (ADR 0016). A hardened part refuses those outright rather than dropping them quietly.
  async updateMountedComponent(
    id: number,
    dto: UpdateMountedComponentDto,
    userId: number,
  ): Promise<Response_BikeComponentDto> {
    const existing = await this.findOwnedComponent(id, userId);

    // What only an Unserviced part will accept. Prisma reads an absent field as "leave
    // alone", so an untouched one is neither refused nor written.
    const wear = {
      mounted_at: dto.mounted_at,
      total_km: dto.total_km,
      total_time_min: dto.total_time_min,
      drivetrain_km: dto.drivetrain_km,
      suspension_min: dto.suspension_min,
    };

    if (Object.values(wear).some((value) => value !== undefined) && !isUnserviced(existing)) {
      throw new BadRequestException(
        'This part has been serviced, so its wear and mounted date can no longer be corrected. Dismount it instead.',
      );
    }

    const updated = await this.prisma.components_mounted.update({
      where: { id },
      data: {
        component_desc: dto.component_desc,
        position: dto.position,
        ...wear,
        updated_at: new Date(),
      },
      include: bikeComponentInclude,
    });

    // A corrected accumulator is a corrected reading, so what the part now says about
    // itself is answered for straight away.
    await this.serviceTracking.evaluateBike(updated.bike_id, userId);
    return toBikeComponentDto(updated, await this.tracksHealthIndex(updated.bike_id, updated.component_type_id));
  }

  // A part comes off with nothing fitted in its place. It stops accumulating and keeps
  // every kilometre it did, staying readable under its category and in the Services it
  // appears in — exactly what the wizard's Replacement path writes for the part going off.
  // Its service history is no bar: any part can be taken off a bike.
  async dismountComponent(id: number, dto: DismountComponentDto, userId: number): Promise<Response_BikeComponentDto> {
    await this.findOwnedComponent(id, userId);

    const dismounted = await this.prisma.components_mounted.update({
      where: { id },
      // A part removed last month came off then, not when the owner got round to saying so.
      data: { is_active: false, removed_at: dto.removed_at ?? new Date(), updated_at: new Date() },
      include: bikeComponentInclude,
    });

    return toBikeComponentDto(dismounted, await this.tracksHealthIndex(dismounted.bike_id, dismounted.component_type_id));
  }

  // The way back out of a row that should never have existed — the same fork added twice.
  // Refused once a Service has recorded work against the part, which deleting would orphan
  // (ADR 0016). Soft, like every other delete in the domain, and the read already excludes
  // it from the build and from the dismounted parts alike.
  async deleteMountedComponent(id: number, userId: number): Promise<Response_BikeComponentDto> {
    const existing = await this.findOwnedComponent(id, userId);

    if (!isUnserviced(existing)) {
      throw new BadRequestException(
        'This part has been serviced, so it can no longer be deleted. Dismount it instead.',
      );
    }

    const deleted = await this.prisma.components_mounted.update({
      where: { id },
      data: { is_deleted: true, deleted_at: new Date(), updated_at: new Date() },
      include: bikeComponentInclude,
    });

    return toBikeComponentDto(deleted, await this.tracksHealthIndex(deleted.bike_id, deleted.component_type_id));
  }

  // The owner's own corner of the catalogue, which is the only part of it they may remove.
  // Each entry carries what still leans on it: the parts naming it and the bikes those sit
  // on, so the list can say what removing it will and will not touch (ADR 0021).
  async getCustomComponentTypes(userId: number): Promise<Response_CustomComponentTypeDto[]> {
    const types = await this.prisma.component_types.findMany({
      where: { user_id: userId, is_deleted: { not: true } },
      include: {
        component_groups: true,
        // Only what the owner can still see counts here: a part they deleted, or one on a
        // bike they deleted, is not a reason to hesitate over the name.
        components_mounted: {
          where: { is_deleted: { not: true }, bikes: { is_deleted: { not: true } } },
          select: { bike_id: true },
        },
      },
      orderBy: { component_type: 'asc' },
    });

    return types.map((type) => ({
      id: type.id,
      component_type: type.component_type,
      component_group_id: type.component_group_id,
      component_group: type.component_groups.group_name,
      component_group_i18n_key: type.component_groups.i18n_key,
      parts_in_use: type.components_mounted.length,
      bikes_in_use: new Set(type.components_mounted.map((part) => part.bike_id)).size,
    }));
  }

  // Removing a type from the owner's catalogue. Deleted outright where nothing references
  // it — the ordinary case, a name typed wrongly — taking the catch-all Replacement target
  // written alongside it. Where any part still holds the type by its foreign key,
  // deleted or not, the row is kept and marked instead, so that part goes on resolving its
  // name and its history (ADR 0021).
  async deleteComponentType(id: number, userId: number): Promise<Response_ComponentDto> {
    // One transaction, because the count decides the delete: a part mounted between the two
    // would leave the hard branch deleting a row something now references.
    return this.prisma.$transaction(async (tx) => {
      // A seeded type carries no owner, so it is not found here and cannot be removed.
      const type = await tx.component_types.findFirst({
        where: { id, user_id: userId, is_deleted: { not: true } },
      });

      if (!type) {
        throw new NotFoundException(`Component type with ID ${id} not found`);
      }

      const referencing = await tx.components_mounted.count({ where: { component_type_id: id } });

      if (referencing === 0) {
        // The catch-all Replacement target written with the type goes with it: the foreign
        // key cascades, so deleting the row is the whole of it.
        await tx.component_types.delete({ where: { id } });
        return type;
      }

      await tx.component_types.update({
        where: { id },
        data: { is_deleted: true, deleted_at: new Date() },
      });

      return type;
    });
  }

  async getAllComponentGroups(): Promise<Response_ComponentGroupDto[]> {
    return this.prisma.component_groups.findMany({});
  }

  // The kinds of part this bike watches a wear index on. An interval the bike carries with
  // a health_index_interval set names an Action, and that Action's targets name the types
  // — so the reading is shown exactly where the bike is configured to expect one.
  private async healthIndexTypeIds(bikeId: number): Promise<Set<number>> {
    const targets = await this.prisma.event_action_targets.findMany({
      where: { events_action: { bike_service_interval: { some: healthIndexInterval(bikeId) } } },
      select: { component_type_id: true },
    });

    return new Set(targets.map((target) => target.component_type_id));
  }

  // The same question asked of one part, which is all a single write reads back.
  private async tracksHealthIndex(bikeId: number, componentTypeId: number): Promise<boolean> {
    const target = await this.prisma.event_action_targets.findFirst({
      where: {
        component_type_id: componentTypeId,
        events_action: { bike_service_interval: { some: healthIndexInterval(bikeId) } },
      },
      select: { id: true },
    });

    return target !== null;
  }

  // A bike is only reachable through its owner; otherwise 404, which leaks nothing about
  // whether it exists at all.
  private async findOwnedBike(bikeId: number, userId: number, options?: OwnedBikeOptions): Promise<void> {
    const bike = await this.prisma.bikes.findFirst({
      where: ownedBikeWhere(bikeId, userId, options),
      select: { id: true },
    });
    if (!bike) {
      throw new NotFoundException(`Bike with ID ${bikeId} not found`);
    }
  }

  // A part is only reachable through the owner of the bike carrying it. An unknown, a
  // foreign or an already deleted one is a 404 alike.
  private async findOwnedComponent(id: number, userId: number): Promise<MountedWithRelations> {
    const component = await this.prisma.components_mounted.findFirst({
      where: { id, is_deleted: { not: true }, bikes: { user_id: userId, is_deleted: { not: true } } },
      include: bikeComponentInclude,
    });
    if (!component) {
      throw new NotFoundException(`Component with ID ${id} not found`);
    }
    return component;
  }
}

function toBikeComponentDto(
  mounted: MountedWithRelations,
  tracksHealthIndex: boolean,
): Response_BikeComponentDto {
  return {
    id: mounted.id,
    bike_id: mounted.bike_id,
    component_type_id: mounted.component_type_id,
    component_type: mounted.component_types.component_type,
    component_type_i18n_key: mounted.component_types.i18n_key,
    component_group_id: mounted.component_types.component_group_id,
    component_group: mounted.component_types.component_groups.group_name,
    component_group_i18n_key: mounted.component_types.component_groups.i18n_key,
    side_choice: mounted.component_types.component_groups.side_choice,
    component_desc: mounted.component_desc,
    position: mounted.position,
    note: mounted.note,
    mounted_at: mounted.mounted_at,
    removed_at: mounted.removed_at,
    is_active: mounted.is_active,
    total_km: mounted.total_km,
    total_time_min: mounted.total_time_min,
    drivetrain_km: mounted.drivetrain_km,
    suspension_min: mounted.suspension_min,
    health_index: mounted.health_index,
    tracks_health_index: tracksHealthIndex,
    last_service_at: lastServiceOf(mounted),
    unserviced: isUnserviced(mounted),
  };
}

// A part is Unserviced exactly when no recorded work points at it — the single join
// ADR 0016 names. A Service that was deleted still leaves its line item pointing here, so
// the part stays hardened: its baselines were frozen against these very accumulators.
function isUnserviced(mounted: MountedWithRelations): boolean {
  return mounted.action_done_component_map.length === 0;
}

// The most recent occasion this part was worked on, or null for one nobody has serviced
// yet. A deleted Service is no longer part of the record, so it does not date one either —
// the same rule the Report reads a build by.
function lastServiceOf(mounted: MountedWithRelations): Date | null {
  const dates = mounted.action_done_component_map
    .map((junction) => junction.event_actions_done.events_bikes)
    .filter((service) => service.is_deleted !== true)
    .map((service) => service.service_date)
    .filter((date): date is Date => date !== null);

  if (dates.length === 0) return null;

  return new Date(Math.max(...dates.map((date) => date.getTime())));
}
