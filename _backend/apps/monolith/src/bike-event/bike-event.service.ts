import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Create_BikeEventDto } from './dto/create-bike-event.dto';
import {
  Response_ActionsOnGroup_Dto,
  Response_BikeEvent_Dto,
  Response_ServiceHistory_Dto,
} from './dto/response-bike-event.dto';

// A history page the user scrolls; the UI asks for more when it needs them.
const DEFAULT_LIMIT = 20;
// One request cannot drain the table.
const MAX_LIMIT = 100;

// Ride sync adds suspension minutes to these alone - see strava.service.ts.
const SUSPENSION_COMPONENT_TYPES: string[] = ['Shock', 'Fork'];

// The bike as a history card needs it - a nickname if the user gave one, the model
// otherwise. Selected rather than included whole: the card has no use for the rest.
const BIKE_SELECT = { bikename: true, bike_brand: true, bike_model: true } as const;

// Wear ridden between the service date and now. Subtracted from today's accumulators
// to reconstruct what they read on the service date - see ADR 0001.
interface WearSince {
  km: number;
  time_min: number;
  drivetrain_km: number;
  suspension_min: number;
}

@Injectable()
export class BikeEventService {
  constructor(private readonly prisma: PrismaService) {}

  async actionsGroupComponents(groupId: number, bikeId: number, userId: number): Promise<Response_ActionsOnGroup_Dto> {
    await this.findOwnedBike(bikeId, userId);

    const group = await this.prisma.component_groups.findUnique({
      where: { id: groupId },
    });
    const actions = await this.prisma.events_action.findMany({
      where: {
        event_action_targets: {
          some: {
            component_types: {
              component_group_id: groupId,
            },
          },
        },
      },
      select: {
        id: true,
        action_name: true,
        i18n_key: true,
        replace_action: true,
        event_action_tags: {
          select: {
            event_action_tag: true,
            i18n_key: true,
          },
        },
        event_action_targets: {
          select: {
            component_types: {
              select: {
                component_type: true,
                i18n_key: true,
                components_mounted: {
                  where: {
                    bike_id: bikeId,
                    is_active: true,
                  },
                  select: {
                    id: true,
                    component_desc: true,
                    position: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const mappedAction = actions.map((action) => ({
      id: action.id,
      action_name: action.action_name,
      action_i18n_key: action.i18n_key,
      replace_action: action.replace_action,
      tags: action.event_action_tags.map((tag) => ({ tag: tag.event_action_tag, i18n_key: tag.i18n_key })),
      components: action.event_action_targets.flatMap((target) =>
        target.component_types.components_mounted.map((mounted) => ({
          id: mounted.id,
          component_desc: mounted.component_desc,
          position: mounted.position,
          component_type: target.component_types.component_type,
          component_type_i18n_key: target.component_types.i18n_key,
          // No service performed yet in this context, so no frozen baselines.
          km_at_time: null,
          time_min_at_time: null,
          drivetrain_km_at_time: null,
          suspension_min_at_time: null,
        })),
      ),
    }));

    return {
      group_id: Number(group!.id),
      group_name: group!.group_name,
      group_i18n_key: group!.i18n_key,
      side_choice: Boolean(group!.side_choice),
      actions: mappedAction,
    };
  }

  async create(dto: Create_BikeEventDto, userId: number): Promise<Response_BikeEvent_Dto> {
    const bike = await this.findOwnedBike(dto.bike_id, userId);
    // A service entered today reads "now"; a backfilled one carries the date the work happened.
    const serviceDate = dto.service_date ? new Date(dto.service_date) : new Date();

    // The wizard sends a day, not a moment, so a ride on the day of the work cannot be
    // ordered against it. The window opens at the end of that day, which is also what
    // makes a service dated today subtract nothing.
    const windowStart = endOfServiceDay(serviceDate);

    const bikeEventID = await this.prisma.$transaction(async (tx) => {
      const wearSince = await this.wearSince(tx, dto.bike_id, windowStart);
      // The odometer as it stood on the service date, so the detail view can show the
      // bike at the time of the work rather than today. bikes.total_km is the mileage the
      // user stated when adding the bike and ride sync never touches it, so what the bike
      // had ridden by then is added to it.
      const riddenUpTo = await this.riddenUpTo(tx, dto.bike_id, windowStart);
      const bikeKmAtTime = (bike.total_km ?? 0) + riddenUpTo.km;
      const bikeMinutesAtTime = (bike.total_time_min ?? 0) + riddenUpTo.time_min;

      const bikeEvent = await tx.events_bikes.create({
        data: {
          bike_id: dto.bike_id,
          note: dto.note,
          total_cost: dto.total_cost,
          service_date: serviceDate,
        },
      });

      if (dto.actions_done?.length) {
        for (const action of dto.actions_done) {
          const actionDone = await tx.event_actions_done.create({
            data: {
              bike_event_id: bikeEvent.id,
              event_action_id: action.action_id,
              note: action.description,
              partial_cost: action.partial_cost,
              part_replaced: action.part_replaced ?? false,
              bike_km_at_time: bikeKmAtTime,
              bike_minutes_at_time: bikeMinutesAtTime,
            },
          });
          if (action.mounted_components_involved?.length) {
            // Freeze each component's wear accumulators so per-action "since last service"
            // stays accurate. Accumulators keep growing; the baseline lives here.
            const components = await tx.components_mounted.findMany({
              where: { id: { in: action.mounted_components_involved } },
              select: {
                id: true,
                total_km: true,
                total_time_min: true,
                drivetrain_km: true,
                suspension_min: true,
              },
            });
            const wearById = new Map(components.map((c) => [c.id, c]));

            await tx.action_done_component_map.createMany({
              data: action.mounted_components_involved.map((componentId) => {
                const wear = wearById.get(componentId);
                return {
                  event_action_done_id: actionDone.id,
                  component_mounted_id: componentId,
                  km_at_time: rewind(wear?.total_km, wearSince.km),
                  time_min_at_time: rewind(wear?.total_time_min, wearSince.time_min),
                  drivetrain_km_at_time: rewind(wear?.drivetrain_km, wearSince.drivetrain_km),
                  suspension_min_at_time: rewind(wear?.suspension_min, wearSince.suspension_min),
                };
              }),
            });
          }
        }
      }

      if (dto.attachment?.length) {
        await tx.bike_event_attachments.createMany({
          data: dto.attachment.map((a) => ({
            bike_event_id: bikeEvent.id,
            name: a.name ?? '',
            url: a.url ?? '',
            content_type: a.content_type ?? '',
          })),
        });
      }

      if (dto.actions_replaced?.length) {
        for (const replacement of dto.actions_replaced) {
          // The old part stopped being worn when it came off, not when this was typed in.
          await tx.components_mounted.update({
            where: { id: replacement.old_component_mounted_id },
            data: { is_active: false, removed_at: serviceDate },
          });

          // Ride sync gives suspension minutes to forks and shocks alone, so seeding them
          // onto anything else would invent wear the part could never have had.
          const componentType = await tx.component_types.findUnique({
            where: { id: replacement.component_type_id },
            select: { component_type: true },
          });
          const takesSuspension = SUSPENSION_COMPONENT_TYPES.includes(componentType?.component_type ?? '');

          // The new part has been on the bike since the service date, so it starts with
          // the wear ridden in that window rather than at zero - see ADR 0001.
          const newComponent = await tx.components_mounted.create({
            data: {
              bike_id: dto.bike_id,
              component_type_id: replacement.component_type_id,
              component_desc: replacement.new_component_desc,
              is_active: true,
              mounted_at: serviceDate,
              total_km: wearSince.km,
              total_time_min: wearSince.time_min,
              drivetrain_km: wearSince.drivetrain_km,
              suspension_min: takesSuspension ? wearSince.suspension_min : 0,
            },
          });

          const actionDone = await tx.event_actions_done.create({
            data: {
              bike_event_id: bikeEvent.id,
              event_action_id: replacement.action_id,
              note: replacement.note,
              partial_cost: replacement.partial_cost,
              part_replaced: true,
              bike_km_at_time: bikeKmAtTime,
              bike_minutes_at_time: bikeMinutesAtTime,
            },
          });
          await tx.action_done_component_map.create({
            data: {
              event_action_done_id: actionDone.id,
              component_mounted_id: newComponent.id,
              // Fresh component starts from zero at install time: on the service date it
              // had been ridden nowhere, whatever it has accumulated since.
              km_at_time: 0,
              time_min_at_time: 0,
              drivetrain_km_at_time: 0,
              suspension_min_at_time: 0,
            },
          });
        }
      }

      return bikeEvent.id;
    });

    return await this.findById(bikeEventID, userId);
  }

  async findAllBikeEvents(bikeId: number, userId: number): Promise<Response_BikeEvent_Dto[]> {
    await this.findOwnedBike(bikeId, userId);

    const bikeEvents = await this.prisma.events_bikes.findMany({
      where: { bike_id: bikeId, is_deleted: false },
      include: {
        event_actions_done: {
          include: {
            events_action: true,
            action_done_component_map: {
              include: {
                components_mounted: {
                  include: {
                    component_types: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return bikeEvents.map((bikeEvent) => this.mapBikeEvent(bikeEvent));
  }

  // The caller's services across every bike they own, or one bike when asked. Ordered by
  // when the work happened, so a backfilled service sorts where it belongs rather than at
  // the top. The total is what lets the UI page or scroll.
  async history(userId: number, limit: number, offset: number, bikeId?: number): Promise<Response_ServiceHistory_Dto> {
    if (bikeId !== undefined) {
      await this.findOwnedBike(bikeId, userId);
    }

    const take = clamp(limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    const skip = clamp(offset, 0, 0, Number.MAX_SAFE_INTEGER);

    // is_deleted is nullable, so `not: true` is what covers both false and the null
    // rows written before the column existed.
    const where = {
      is_deleted: { not: true },
      ...(bikeId !== undefined ? { bike_id: bikeId } : { bikes: { user_id: userId } }),
    };

    const [services, total] = await Promise.all([
      this.prisma.events_bikes.findMany({
        where,
        // Nulls last: service_date is nullable, and a service with no date belongs at
        // the bottom rather than ahead of work the user actually dated.
        orderBy: { service_date: { sort: 'desc' as const, nulls: 'last' as const } },
        take,
        skip,
        select: {
          id: true,
          bike_id: true,
          service_date: true,
          total_cost: true,
          bikes: { select: BIKE_SELECT },
          event_actions_done: { select: { events_action: { select: { action_name: true } } } },
        },
      }),
      this.prisma.events_bikes.count({ where }),
    ]);

    return {
      total,
      items: services.map((service) => ({
        id: service.id,
        bike_id: service.bike_id!,
        bike_name: bikeName(service.bikes),
        service_date: service.service_date,
        action_count: service.event_actions_done.length,
        action_names: service.event_actions_done.map((actionDone) => actionDone.events_action.action_name),
        total_cost: service.total_cost === null ? null : Number(service.total_cost),
      })),
    };
  }

  async findById(bikeEventId: number, userId: number): Promise<Response_BikeEvent_Dto> {
    await this.assertServiceOwned(bikeEventId, userId);

    const bikeEvent = await this.prisma.events_bikes.findUnique({
      where: { id: bikeEventId },
      include: {
        event_actions_done: {
          include: {
            events_action: true,
            action_done_component_map: {
              include: {
                components_mounted: {
                  include: {
                    component_types: true,
                  },
                },
              },
            },
          },
        },
        bike_event_attachments: true,
      },
    });

    return this.mapBikeEvent(bikeEvent);
  }

  async softDelete(bikeEventId: number, userId: number): Promise<void> {
    await this.assertServiceOwned(bikeEventId, userId);

    await this.prisma.events_bikes.update({
      where: { id: bikeEventId },
      data: { is_deleted: true, deleted_at: new Date() },
    });
  }

  async hardDelete(bikeEventId: number, userId: number): Promise<void> {
    await this.assertServiceOwned(bikeEventId, userId);

    await this.prisma.events_bikes.delete({ where: { id: bikeEventId } });
  }

  // A service is only ever read or written through its bike, so ownership is checked there.
  // Someone else's bike is forbidden rather than missing: the caller knows the bike exists,
  // they just may not touch it.
  private async findOwnedBike(
    bikeId: number,
    userId: number,
  ): Promise<{ total_km: number | null; total_time_min: number | null }> {
    const bike = await this.prisma.bikes.findFirst({
      where: { id: bikeId, user_id: userId, is_deleted: { not: true } },
      select: { total_km: true, total_time_min: true },
    });
    if (!bike) {
      throw new ForbiddenException(`Bike with ID ${bikeId} does not belong to this user`);
    }
    return bike;
  }

  // A service reached by its own id still belongs to a bike, and that bike still has to
  // be the caller's.
  private async assertServiceOwned(bikeEventId: number, userId: number): Promise<void> {
    const service = await this.prisma.events_bikes.findFirst({
      where: { id: bikeEventId, bikes: { user_id: userId } },
      select: { id: true },
    });
    if (!service) {
      throw new ForbiddenException(`Service with ID ${bikeEventId} does not belong to this user`);
    }
  }

  // Sums the rides taken after the window opened. A bike with no rides yields zeroes,
  // which leaves every baseline at today's accumulators - the correct answer, because
  // an unsynced bike's accumulators do not grow either.
  private async wearSince(tx: Prisma.TransactionClient, bikeId: number, windowStart: Date): Promise<WearSince> {
    return this.rideTotals(tx, bikeId, { gt: windowStart });
  }

  // The mirror image: what the bike had ridden by the time of the work.
  private async riddenUpTo(tx: Prisma.TransactionClient, bikeId: number, windowStart: Date): Promise<WearSince> {
    return this.rideTotals(tx, bikeId, { lte: windowStart });
  }

  // is_deleted is nullable, so `not: true` is what covers both false and the null rows
  // written before the column existed.
  private async rideTotals(
    tx: Prisma.TransactionClient,
    bikeId: number,
    window: { gt: Date } | { lte: Date },
  ): Promise<WearSince> {
    const totals = await tx.rides.aggregate({
      where: { bike_id: bikeId, is_deleted: { not: true }, started_at: window },
      _sum: { distance_m: true, duration_min: true, drivetrain_meters: true, suspension_min: true },
    });

    return {
      km: Math.floor((totals._sum.distance_m ?? 0) / 1000),
      time_min: totals._sum.duration_min ?? 0,
      drivetrain_km: Math.floor((totals._sum.drivetrain_meters ?? 0) / 1000),
      suspension_min: totals._sum.suspension_min ?? 0,
    };
  }

  private mapBikeEvent(bikeEvent: any): Response_BikeEvent_Dto {
    return {
      id: bikeEvent.id,
      bike_id: bikeEvent.bike_id!,
      note: bikeEvent.note,
      total_cost: Number(bikeEvent.total_cost),
      service_date: bikeEvent.service_date ?? null,
      created_at: bikeEvent.created_at!,
      updated_at: bikeEvent.updated_at,
      attachments: bikeEvent.bike_event_attachments?.map((a) => ({
        id: a.id,
        name: a.name,
        content_type: a.content_type,
        url: a.url,
      })),
      actions_done: bikeEvent.event_actions_done.map((actionDone) => ({
        action_id: actionDone.event_action_id,
        action_name: actionDone.events_action.action_name,
        action_i18n_key: actionDone.events_action.i18n_key,
        partial_cost: Number(actionDone.partial_cost),
        replace_action: actionDone.events_action.replace_action,
        note: actionDone.note ?? null,
        mounted_components: actionDone.action_done_component_map.map((junc) => ({
          id: junc.components_mounted.id,
          component_desc: junc.components_mounted.component_desc,
          position: junc.components_mounted.position,
          component_type: junc.components_mounted.component_types.component_type,
          component_type_i18n_key: junc.components_mounted.component_types.i18n_key,
          km_at_time: junc.km_at_time,
          time_min_at_time: junc.time_min_at_time,
          drivetrain_km_at_time: junc.drivetrain_km_at_time,
          suspension_min_at_time: junc.suspension_min_at_time,
        })),
      })),
    };
  }
}

// A baseline never goes below zero: a component mounted after the service date has less
// wear on it than the bike rode in that window.
function clampToZero(value: number): number {
  return Math.max(0, value);
}

// Today's accumulator minus what was ridden since the work, which is what the component
// read on the service date.
function rewind(accumulator: number | null | undefined, riddenSince: number): number | null {
  if (accumulator === null || accumulator === undefined) {
    return null;
  }
  return clampToZero(accumulator - riddenSince);
}

// A user names their bike, but not always - falling back to brand and model keeps the
// history card from showing a nameless entry.
function bikeName(
  bike: { bikename: string | null; bike_brand: string; bike_model: string | null } | null,
): string | null {
  if (!bike) {
    return null;
  }
  return bike.bikename ?? [bike.bike_brand, bike.bike_model].filter(Boolean).join(' ');
}

// A page size the caller left out arrives as NaN and takes the default; one they
// pushed too far is pulled back into range.
function clamp(value: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(Math.trunc(value), min), max);
}

// A service date is a day. Rides on that day cannot be placed before or after the work,
// so they count as ridden by it rather than since it.
function endOfServiceDay(serviceDate: Date): Date {
  const end = new Date(serviceDate);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}
