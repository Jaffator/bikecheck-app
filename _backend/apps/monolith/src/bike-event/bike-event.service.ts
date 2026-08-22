import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  Actions_BikeEventDto,
  Attachment_BikeEventDto,
  Create_BikeEventDto,
  Replaced_ComponentsDto,
} from './dto/create-bike-event.dto';
import { Update_BikeEventDto } from './dto/update-bike-event.dto';
import {
  Response_ActionsOnGroup_Dto,
  Response_BikeCategory_Dto,
  Response_BikeEvent_Dto,
  Response_ServiceAttachment_Dto,
  Response_ServiceHistory_Dto,
} from './dto/response-bike-event.dto';

// A history page the user scrolls; the UI asks for more when it needs them.
const DEFAULT_LIMIT = 20;
// One request cannot drain the table.
const MAX_LIMIT = 100;

// A part the bike still carries. Work can only be recorded against these: one taken off,
// or deleted, is not something the bike can receive a service on.
const MOUNTED_ON_BIKE = { is_active: true, is_deleted: { not: true } } as const;

// Receipts and invoices live apart from the bike photos.
const ATTACHMENT_FOLDER = 'service-attachments' as const;
// A photographed receipt is re-encoded on the way up, so what is stored is a webp
// whatever the phone sent.
const STORED_IMAGE_TYPE = 'image/webp';
const PDF_TYPE = 'application/pdf';

// Ride sync adds suspension minutes to these alone - see strava.service.ts.
const SUSPENSION_COMPONENT_TYPES: string[] = ['Shock', 'Fork'];

// The bike as a history card needs it - a nickname if the user gave one, the model
// otherwise. Selected rather than included whole: the card has no use for the rest.
const BIKE_SELECT = { bikename: true, bike_brand: true, bike_model: true } as const;

// What the caller's own bike tells the service: where its odometer stands, and which
// actions it is physically able to receive.
interface OwnedBike {
  total_km: number | null;
  total_time_min: number | null;
  has_front_suspension: boolean;
  has_rear_suspension: boolean;
}

// Wear ridden between the service date and now. Subtracted from today's accumulators
// to reconstruct what they read on the service date - see ADR 0001.
interface WearSince {
  km: number;
  time_min: number;
  drivetrain_km: number;
  suspension_min: number;
}

// Everything the service date decides, worked out once per write: how much wear to rewind
// out of each baseline, and where the bike's odometer stood when the work happened.
interface ServiceMoment {
  wearSince: WearSince;
  odometer: { km: number; minutes: number };
}

// One catalogue tag as the detail query reads it back.
interface ActionTagRow {
  event_action_tag: string;
  i18n_key: string | null;
}

// A Service as an edit reads it back, once its bike is known to be there.
interface SavedService {
  bike_id: number;
  service_date: Date | null;
  event_actions_done: SavedAction[];
}

// An Action already recorded on a Service, with the components whose wear it froze.
interface SavedAction {
  id: number;
  part_replaced: boolean | null;
  action_done_component_map: { component_mounted_id: number }[];
}

@Injectable()
export class BikeEventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // A receipt or invoice, stored before the Service exists so the wizard's Save is not a
  // long silent wait. The wizard holds the returned URL and hands it back on create.
  async uploadAttachment(file: Express.Multer.File): Promise<Response_ServiceAttachment_Dto> {
    if (file.mimetype === PDF_TYPE) {
      return {
        name: file.originalname,
        url: await this.storage.uploadPdfR2CloudFare(file.buffer, ATTACHMENT_FOLDER),
        content_type: PDF_TYPE,
      };
    }

    if (file.mimetype.startsWith('image/')) {
      return {
        name: file.originalname,
        url: await this.storage.uploadImageR2CloudFare(file.buffer, ATTACHMENT_FOLDER),
        content_type: STORED_IMAGE_TYPE,
      };
    }

    throw new BadRequestException(`Unsupported attachment type: ${file.mimetype || 'unknown'}`);
  }

  // The categories the bike actually has parts in, which is the only choice the wizard can
  // offer at its second step. A category with nothing mounted in it is left out rather than
  // shown empty.
  async categoriesOnBike(bikeId: number, userId: number): Promise<Response_BikeCategory_Dto[]> {
    await this.findOwnedBike(bikeId, userId);

    const parts = await this.prisma.components_mounted.findMany({
      where: { bike_id: bikeId, ...MOUNTED_ON_BIKE },
      select: {
        component_types: {
          select: {
            component_groups: { select: { id: true, group_name: true, i18n_key: true, side_choice: true } },
          },
        },
      },
    });

    // Counted here rather than by groupBy: the query has to reach through component_types to
    // the category, and a bike carries tens of parts, not thousands.
    const categories = new Map<number, Response_BikeCategory_Dto>();
    for (const part of parts) {
      const group = part.component_types.component_groups;
      const seen = categories.get(group.id);
      if (seen) {
        seen.component_count += 1;
        continue;
      }
      categories.set(group.id, {
        group_id: group.id,
        group_name: group.group_name,
        group_i18n_key: group.i18n_key,
        side_choice: group.side_choice,
        component_count: 1,
      });
    }

    // Seed order, so the categories arrive in the same order on every bike.
    return [...categories.values()].sort((a, b) => a.group_id - b.group_id);
  }

  async actionsGroupComponents(groupId: number, bikeId: number, userId: number): Promise<Response_ActionsOnGroup_Dto> {
    const bike = await this.findOwnedBike(bikeId, userId);

    const group = await this.prisma.component_groups.findUnique({
      where: { id: groupId },
    });
    const actions = await this.prisma.events_action.findMany({
      where: {
        event_action_targets: {
          some: {
            component_types: {
              component_group_id: groupId,
              // Only work the bike can receive: an action whose target type is not mounted
              // has nothing to be performed on.
              components_mounted: { some: { bike_id: bikeId, ...MOUNTED_ON_BIKE } },
            },
          },
        },
        // A rigid fork cannot be serviced, so the actions that need one are not offered.
        // Asked about only when the bike lacks that suspension, which leaves a full
        // suspension bike with the whole catalogue.
        ...(bike.has_front_suspension ? {} : { req_front_suspension: false }),
        ...(bike.has_rear_suspension ? {} : { req_rear_suspension: false }),
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
                    ...MOUNTED_ON_BIKE,
                  },
                  select: {
                    id: true,
                    component_type_id: true,
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
          component_type_id: mounted.component_type_id,
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

    const bikeEventID = await this.prisma.$transaction(async (tx) => {
      const moment = await this.serviceMoment(tx, dto.bike_id, bike, serviceDate);

      const bikeEvent = await tx.events_bikes.create({
        data: {
          bike_id: dto.bike_id,
          note: dto.note,
          total_cost: dto.total_cost,
          service_date: serviceDate,
        },
      });

      await this.writeActions(tx, bikeEvent.id, dto.bike_id, dto.actions_done, moment);
      await this.writeAttachments(tx, bikeEvent.id, dto.attachment);
      await this.writeReplacements(tx, bikeEvent.id, dto.bike_id, dto.actions_replaced, serviceDate, moment);

      return bikeEvent.id;
    });

    return await this.findById(bikeEventID, userId);
  }

  // A receipt arrives later, a price was wrong, or an action was forgotten. Everything an
  // edit may touch is a correction to what was written down; what it may not do is undo a
  // Replacement, because the part that went on may already carry rides, later services or
  // its own replacement - see ADR 0003.
  async update(bikeEventId: number, dto: Update_BikeEventDto, userId: number): Promise<Response_BikeEvent_Dto> {
    await this.assertServiceOwned(bikeEventId, userId);

    await this.prisma.$transaction(async (tx) => {
      const saved = await this.loadSavedService(tx, bikeEventId);

      const removed = dto.actions_removed ?? [];
      this.assertRemovable(saved.event_actions_done, removed);

      const bike = await tx.bikes.findFirstOrThrow({
        where: { id: saved.bike_id },
        select: { total_km: true, total_time_min: true, has_front_suspension: true, has_rear_suspension: true },
      });

      // An untouched date leaves the service where it was; a service that never carried one
      // is treated as having happened now, the same reading create gives it.
      const serviceDate = dto.service_date ? new Date(dto.service_date) : (saved.service_date ?? new Date());
      const dateMoved = dto.service_date !== undefined && serviceDate.getTime() !== saved.service_date?.getTime();
      const moment = await this.serviceMoment(tx, saved.bike_id, bike, serviceDate);

      await this.editExistingActions(tx, bikeEventId, dto, removed);

      if (dateMoved) {
        const surviving = saved.event_actions_done.filter((action) => !removed.includes(action.id));
        await this.rewriteBaselines(tx, saved.bike_id, surviving, serviceDate, saved.service_date, moment);
      }

      // An added action takes the same path a new one does, so it is frozen against the
      // service date rather than against today.
      await this.writeActions(tx, bikeEventId, saved.bike_id, dto.actions_done, moment);
      await this.writeReplacements(tx, bikeEventId, saved.bike_id, dto.actions_replaced, serviceDate, moment);

      if (dto.attachments_removed?.length) {
        await tx.bike_event_attachments.deleteMany({
          where: { id: { in: dto.attachments_removed }, bike_event_id: bikeEventId },
        });
      }
      await this.writeAttachments(tx, bikeEventId, dto.attachments_added);

      await tx.events_bikes.update({
        where: { id: bikeEventId },
        data: {
          note: dto.note,
          total_cost: dto.total_cost,
          // Only a date the caller actually sent overwrites the one on record.
          service_date: dto.service_date ? serviceDate : undefined,
          updated_at: new Date(),
        },
      });
    });

    return await this.findById(bikeEventId, userId);
  }

  async findAllBikeEvents(bikeId: number, userId: number): Promise<Response_BikeEvent_Dto[]> {
    await this.findOwnedBike(bikeId, userId);

    const bikeEvents = await this.prisma.events_bikes.findMany({
      where: { bike_id: bikeId, is_deleted: false },
      include: {
        bikes: { select: BIKE_SELECT },
        event_actions_done: {
          include: {
            events_action: { include: { event_action_tags: true } },
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
        bikes: { select: BIKE_SELECT },
        event_actions_done: {
          include: {
            // The tags come from the catalogue: what the job includes is a property of the
            // action, never of the occasion - see ADR 0004.
            events_action: { include: { event_action_tags: true } },
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

  // The service leaves the history but stays on record. Returns what was removed, so the
  // caller gets a body to parse rather than an empty response.
  async softDelete(bikeEventId: number, userId: number): Promise<Response_BikeEvent_Dto> {
    await this.assertServiceOwned(bikeEventId, userId);

    await this.prisma.events_bikes.update({
      where: { id: bikeEventId },
      data: { is_deleted: true, deleted_at: new Date() },
    });

    return await this.findById(bikeEventId, userId);
  }

  async hardDelete(bikeEventId: number, userId: number): Promise<void> {
    await this.assertServiceOwned(bikeEventId, userId);

    await this.prisma.events_bikes.delete({ where: { id: bikeEventId } });
  }

  // Everything the service date decides. Computed once and handed to every writer, so one
  // service asks the rides table the same two questions no matter how many actions it carries.
  private async serviceMoment(
    tx: Prisma.TransactionClient,
    bikeId: number,
    bike: OwnedBike,
    serviceDate: Date,
  ): Promise<ServiceMoment> {
    // The wizard sends a day, not a moment, so a ride on the day of the work cannot be
    // ordered against it. The window opens at the end of that day, which is also what
    // makes a service dated today subtract nothing.
    const windowStart = endOfServiceDay(serviceDate);
    const wearSince = await this.wearSince(tx, bikeId, windowStart);
    // The odometer as it stood on the service date, so the detail view can show the bike at
    // the time of the work rather than today. bikes.total_km is the mileage the user stated
    // when adding the bike and ride sync never touches it, so what the bike had ridden by
    // then is added to it.
    const riddenUpTo = await this.riddenUpTo(tx, bikeId, windowStart);

    return {
      wearSince,
      odometer: {
        km: (bike.total_km ?? 0) + riddenUpTo.km,
        minutes: (bike.total_time_min ?? 0) + riddenUpTo.time_min,
      },
    };
  }

  private async writeActions(
    tx: Prisma.TransactionClient,
    bikeEventId: number,
    bikeId: number,
    actions: Actions_BikeEventDto[] | undefined,
    moment: ServiceMoment,
  ): Promise<void> {
    if (!actions?.length) {
      return;
    }
    await this.assertComponentsOnBike(
      tx,
      bikeId,
      actions.flatMap((action) => action.mounted_components_involved ?? []),
    );

    for (const action of actions) {
      const actionDone = await tx.event_actions_done.create({
        data: {
          bike_event_id: bikeEventId,
          event_action_id: action.action_id,
          note: action.description,
          partial_cost: action.partial_cost,
          part_replaced: action.part_replaced ?? false,
          bike_km_at_time: moment.odometer.km,
          bike_minutes_at_time: moment.odometer.minutes,
        },
      });
      if (!action.mounted_components_involved?.length) {
        continue;
      }

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
      const wearById = new Map(components.map((component) => [component.id, component]));

      await tx.action_done_component_map.createMany({
        data: action.mounted_components_involved.map((componentId) => {
          const wear = wearById.get(componentId);
          return {
            event_action_done_id: actionDone.id,
            component_mounted_id: componentId,
            km_at_time: rewind(wear?.total_km, moment.wearSince.km),
            time_min_at_time: rewind(wear?.total_time_min, moment.wearSince.time_min),
            drivetrain_km_at_time: rewind(wear?.drivetrain_km, moment.wearSince.drivetrain_km),
            suspension_min_at_time: rewind(wear?.suspension_min, moment.wearSince.suspension_min),
          };
        }),
      });
    }
  }

  private async writeReplacements(
    tx: Prisma.TransactionClient,
    bikeEventId: number,
    bikeId: number,
    replacements: Replaced_ComponentsDto[] | undefined,
    serviceDate: Date,
    moment: ServiceMoment,
  ): Promise<void> {
    if (!replacements?.length) {
      return;
    }
    await this.assertComponentsOnBike(
      tx,
      bikeId,
      replacements.map((replacement) => replacement.old_component_mounted_id),
    );

    for (const replacement of replacements) {
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
          bike_id: bikeId,
          component_type_id: replacement.component_type_id,
          component_desc: replacement.new_component_desc,
          is_active: true,
          mounted_at: serviceDate,
          total_km: moment.wearSince.km,
          total_time_min: moment.wearSince.time_min,
          drivetrain_km: moment.wearSince.drivetrain_km,
          suspension_min: takesSuspension ? moment.wearSince.suspension_min : 0,
        },
      });

      const actionDone = await tx.event_actions_done.create({
        data: {
          bike_event_id: bikeEventId,
          event_action_id: replacement.action_id,
          note: replacement.note,
          partial_cost: replacement.partial_cost,
          part_replaced: true,
          bike_km_at_time: moment.odometer.km,
          bike_minutes_at_time: moment.odometer.minutes,
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

  private async writeAttachments(
    tx: Prisma.TransactionClient,
    bikeEventId: number,
    attachments: Attachment_BikeEventDto[] | undefined,
  ): Promise<void> {
    if (!attachments?.length) {
      return;
    }

    await tx.bike_event_attachments.createMany({
      data: attachments.map((attachment) => ({
        bike_event_id: bikeEventId,
        name: attachment.name ?? '',
        url: attachment.url ?? '',
        content_type: attachment.content_type ?? '',
      })),
    });
  }

  // The service as it stands, with just enough of each action to tell a Replacement from an
  // ordinary one and to reach the components whose wear it froze.
  private async loadSavedService(tx: Prisma.TransactionClient, bikeEventId: number): Promise<SavedService> {
    const saved = await tx.events_bikes.findUnique({
      where: { id: bikeEventId },
      select: {
        bike_id: true,
        service_date: true,
        event_actions_done: {
          select: {
            id: true,
            part_replaced: true,
            action_done_component_map: { select: { component_mounted_id: true } },
          },
        },
      },
    });
    if (!saved?.bike_id) {
      throw new NotFoundException(`Service with ID ${bikeEventId} was not found`);
    }

    return { ...saved, bike_id: saved.bike_id };
  }

  // Removals and corrections to actions the service already carries. Every write is scoped
  // to the service, so an id belonging to another one cannot be reached through it.
  private async editExistingActions(
    tx: Prisma.TransactionClient,
    bikeEventId: number,
    dto: Update_BikeEventDto,
    removed: number[],
  ): Promise<void> {
    if (removed.length) {
      await tx.event_actions_done.deleteMany({ where: { id: { in: removed }, bike_event_id: bikeEventId } });
    }

    for (const edit of dto.actions_updated ?? []) {
      await tx.event_actions_done.updateMany({
        where: { id: edit.action_done_id, bike_event_id: bikeEventId },
        data: { partial_cost: edit.partial_cost, note: edit.description },
      });
    }
  }

  // Every component a service writes against has to be on the service's own bike. The ids
  // come from the client, so without this a caller could freeze - or deactivate - a part of
  // someone else's bike through a service they legitimately own.
  private async assertComponentsOnBike(
    tx: Prisma.TransactionClient,
    bikeId: number,
    componentIds: number[],
  ): Promise<void> {
    const asked = [...new Set(componentIds)];
    if (!asked.length) {
      return;
    }

    const onBike = await tx.components_mounted.count({ where: { id: { in: asked }, bike_id: bikeId } });
    if (onBike !== asked.length) {
      throw new ForbiddenException('A component in this service does not belong to this bike');
    }
  }

  // A Replacement is not an entry that can be taken back: the component it created may
  // already carry rides, later services, or its own replacement - see ADR 0003. Refused
  // before anything is written, with a message the UI can put in front of the user.
  private assertRemovable(actions: SavedAction[], removed: number[]): void {
    for (const actionDoneId of removed) {
      const action = actions.find((candidate) => candidate.id === actionDoneId);
      if (!action) {
        throw new BadRequestException(`Action ${actionDoneId} is not part of this service`);
      }
      if (action.part_replaced) {
        throw new BadRequestException(
          `Action ${actionDoneId} replaced a part and cannot be removed. The part it fitted may already carry rides, later services or its own replacement - delete the whole service instead.`,
        );
      }
    }
  }

  // Moving the service date moves every number the service froze: the odometer it recorded,
  // the baseline under each action, and the parts a replacement swapped - see ADR 0001.
  private async rewriteBaselines(
    tx: Prisma.TransactionClient,
    bikeId: number,
    actions: SavedAction[],
    newDate: Date,
    oldDate: Date | null,
    moment: ServiceMoment,
  ): Promise<void> {
    // What the bike has ridden since the date the service used to carry. A replacement part
    // is moved by the difference between the two windows rather than overwritten, so rides
    // synced after the service was entered are not thrown away.
    const wearSinceOld = await this.wearSince(tx, bikeId, endOfServiceDay(oldDate ?? newDate));

    for (const action of actions) {
      await tx.event_actions_done.updateMany({
        where: { id: action.id },
        data: { bike_km_at_time: moment.odometer.km, bike_minutes_at_time: moment.odometer.minutes },
      });

      for (const mapped of action.action_done_component_map) {
        if (action.part_replaced) {
          // The part this action fitted. Its baselines stay at zero - on the service date the
          // part had been ridden nowhere - but the part itself moves with the work.
          await this.remountReplacement(
            tx,
            bikeId,
            mapped.component_mounted_id,
            newDate,
            oldDate,
            moment,
            wearSinceOld,
          );
          continue;
        }

        const component = await tx.components_mounted.findUnique({
          where: { id: mapped.component_mounted_id },
          select: { total_km: true, total_time_min: true, drivetrain_km: true, suspension_min: true },
        });
        await tx.action_done_component_map.update({
          where: {
            event_action_done_id_component_mounted_id: {
              event_action_done_id: action.id,
              component_mounted_id: mapped.component_mounted_id,
            },
          },
          data: {
            km_at_time: rewind(component?.total_km, moment.wearSince.km),
            time_min_at_time: rewind(component?.total_time_min, moment.wearSince.time_min),
            drivetrain_km_at_time: rewind(component?.drivetrain_km, moment.wearSince.drivetrain_km),
            suspension_min_at_time: rewind(component?.suspension_min, moment.wearSince.suspension_min),
          },
        });
      }
    }
  }

  // The part a Replacement fitted has been on the bike since the work happened, so moving the
  // date moves the part with it - both when it went on and the wear it has carried since.
  private async remountReplacement(
    tx: Prisma.TransactionClient,
    bikeId: number,
    componentId: number,
    newDate: Date,
    oldDate: Date | null,
    moment: ServiceMoment,
    wearSinceOld: WearSince,
  ): Promise<void> {
    const component = await tx.components_mounted.findUnique({
      where: { id: componentId },
      select: {
        component_type_id: true,
        total_km: true,
        total_time_min: true,
        drivetrain_km: true,
        suspension_min: true,
        component_types: { select: { component_type: true } },
      },
    });
    if (!component) {
      return;
    }

    const takesSuspension = SUSPENSION_COMPONENT_TYPES.includes(component.component_types.component_type);
    await tx.components_mounted.update({
      where: { id: componentId },
      data: {
        mounted_at: newDate,
        total_km: shift(component.total_km, moment.wearSince.km - wearSinceOld.km),
        total_time_min: shift(component.total_time_min, moment.wearSince.time_min - wearSinceOld.time_min),
        drivetrain_km: shift(component.drivetrain_km, moment.wearSince.drivetrain_km - wearSinceOld.drivetrain_km),
        suspension_min: takesSuspension
          ? shift(component.suspension_min, moment.wearSince.suspension_min - wearSinceOld.suspension_min)
          : (component.suspension_min ?? 0),
      },
    });

    if (!oldDate) {
      return;
    }
    // The part that came off did so when the work happened, so its removal date moves too.
    // Only the part that went on is recorded against the action, so the one it replaced is
    // reached by the date it was removed on and the component type the two shared.
    await tx.components_mounted.updateMany({
      where: {
        bike_id: bikeId,
        is_active: false,
        removed_at: oldDate,
        component_type_id: component.component_type_id,
      },
      data: { removed_at: newDate },
    });
  }

  // A service is only ever read or written through its bike, so ownership is checked there.
  // Someone else's bike is forbidden rather than missing: the caller knows the bike exists,
  // they just may not touch it.
  private async findOwnedBike(bikeId: number, userId: number): Promise<OwnedBike> {
    const bike = await this.prisma.bikes.findFirst({
      where: { id: bikeId, user_id: userId, is_deleted: { not: true } },
      select: { total_km: true, total_time_min: true, has_front_suspension: true, has_rear_suspension: true },
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
    // Every action on one service froze the same odometer, so the first one carries it for
    // the whole occasion. A service with no actions never froze it at all.
    const odometer = bikeEvent.event_actions_done[0];

    return {
      id: bikeEvent.id,
      bike_id: bikeEvent.bike_id!,
      bike_name: bikeName(bikeEvent.bikes ?? null),
      bike_km_at_time: odometer?.bike_km_at_time ?? null,
      bike_minutes_at_time: odometer?.bike_minutes_at_time ?? null,
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
        action_done_id: actionDone.id,
        action_id: actionDone.event_action_id,
        action_name: actionDone.events_action.action_name,
        action_i18n_key: actionDone.events_action.i18n_key,
        // A price nobody recorded stays absent: Number(null) would read as free work.
        partial_cost: actionDone.partial_cost === null ? null : Number(actionDone.partial_cost),
        replace_action: actionDone.events_action.replace_action,
        note: actionDone.note ?? null,
        tags: (actionDone.events_action.event_action_tags ?? []).map((tag: ActionTagRow) => ({
          tag: tag.event_action_tag,
          i18n_key: tag.i18n_key,
        })),
        mounted_components: actionDone.action_done_component_map.map((junc) => ({
          id: junc.components_mounted.id,
          component_type_id: junc.components_mounted.component_type_id,
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

// Wear that moves with the service date. Clamped at zero, because a part cannot have been
// ridden less than nowhere.
function shift(accumulator: number | null, by: number): number {
  return clampToZero((accumulator ?? 0) + by);
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
