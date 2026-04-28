/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Create_BikeEventDto } from './dto/create-bike-event.dto';
import { Response_ActionsOnGroup_Dto, Response_BikeEvent_Dto } from './dto/response-bike-event.dto';

@Injectable()
export class BikeEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  //--------------------------------------------------------------------------------------
  // -------------------- Based on GroupID and BikeID get all actions --------------------
  // -------------------------------------------------------------------------------------
  async getActionsGroupComponents(groupId: number, bikeId: number): Promise<Response_ActionsOnGroup_Dto> {
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
        replace_action: true,
        event_action_tags: {
          select: {
            event_action_tag: true,
          },
        },
        event_action_targets: {
          select: {
            component_types: {
              select: {
                component_type: true,
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
      replace_action: action.replace_action,
      tags: action.event_action_tags.map((tag) => tag.event_action_tag),
      components: action.event_action_targets.flatMap((target) =>
        target.component_types.components_mounted.map((mounted) => ({
          id: mounted.id,
          component_desc: mounted.component_desc,
          position: mounted.position,
          component_type: target.component_types.component_type,
        })),
      ),
    }));
    const actionsOnGroupComponents = {
      group_id: Number(group!.id),
      group_name: group!.group_name,
      side_choice: Boolean(group!.side_choice),
      actions: mappedAction,
    };
    return actionsOnGroupComponents;
  }

  // ---------------------------------------------------------------
  // -------------------- Create new Bike Event --------------------
  // ---------------------------------------------------------------
  async create(data: Create_BikeEventDto): Promise<Response_BikeEvent_Dto> {
    const bikeEventID = await this.prisma.$transaction(async (tx) => {
      // 1. Create bike event
      const bikeEvent = await tx.events_bikes.create({
        data: {
          bike_id: data.bike_id,
          note: data.note,
          total_cost: data.total_cost,
        },
      });

      // 2. Service actions – one event_actions_done for each action, explicit junction to components
      if (data.actions_done?.length) {
        for (const action of data.actions_done) {
          const actionDone = await tx.event_actions_done.create({
            data: {
              bike_event_id: bikeEvent.id,
              event_action_id: action.action_id,
              note: action.description,
              partial_cost: action.partial_cost,
              part_replaced: action.part_replaced ?? false,
            },
          });
          if (action.mounted_components_involved?.length) {
            await tx.action_done_component_map.createMany({
              data: action.mounted_components_involved.map((componentId) => ({
                event_action_done_id: actionDone.id,
                component_mounted_id: componentId,
              })),
            });
          }
        }
      }

      // 3. Handle Attachments
      if (data.attachment?.length) {
        await tx.bike_event_attachments.createMany({
          data: data.attachment.map((a) => ({
            bike_event_id: bikeEvent.id,
            name: a.name ?? '',
            url: a.url ?? '',
            content_type: a.content_type ?? '',
          })),
        });
      }

      // 4. Component replacements – deactivate old component and create new one, log the replacement as an action with part_replaced = true
      if (data.actions_replaced?.length) {
        for (const replacement of data.actions_replaced) {
          // Deactivate old component
          await tx.components_mounted.update({
            where: { id: replacement.old_component_mounted_id },
            data: { is_active: false },
          });

          // Create new component
          const newComponent = await tx.components_mounted.create({
            data: {
              bike_id: data.bike_id,
              component_type_id: replacement.component_type_id,
              component_desc: replacement.new_component_desc,
              is_active: true,
            },
          });

          // Log the replacement as an action with part_replaced = true
          const actionDone = await tx.event_actions_done.create({
            data: {
              bike_event_id: bikeEvent.id,
              event_action_id: replacement.action_id,
              note: replacement.note,
              partial_cost: replacement.partial_cost,
              part_replaced: true,
            },
          });
          await tx.action_done_component_map.create({
            data: {
              event_action_done_id: actionDone.id,
              component_mounted_id: newComponent.id,
            },
          });
        }
      }
      return bikeEvent.id;
    });
    // 4. Load the result bike event with all related data to return
    return await this.findById(bikeEventID);
  }

  // -----------------------------------------------------------------------
  // -------------------- Get a single bike event by ID --------------------
  // -----------------------------------------------------------------------
  async findById(bikeEvent_id: number): Promise<Response_BikeEvent_Dto> {
    const bikeEvent = await this.prisma.events_bikes.findUnique({
      where: { id: bikeEvent_id },
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

  async findAllByBikeId(bikeId: number): Promise<Response_BikeEvent_Dto[]> {
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
  private mapBikeEvent(bikeEvent: any): Response_BikeEvent_Dto {
    return {
      id: bikeEvent.id,
      bike_id: bikeEvent.bike_id!,
      note: bikeEvent.note,
      total_cost: Number(bikeEvent.total_cost),
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
        partial_cost: Number(actionDone.partial_cost),
        replace_action: actionDone.events_action.replace_action,
        note: actionDone.note ?? null,
        mounted_components: actionDone.action_done_component_map.map((junc) => ({
          id: junc.components_mounted.id,
          component_desc: junc.components_mounted.component_desc,
          position: junc.components_mounted.position,
          component_type: junc.components_mounted.component_types.component_type,
        })),
      })),
    };
  }
  async softDelete(id: number): Promise<void> {
    await this.prisma.events_bikes.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
    });
  }

  async hardDelete(id: number): Promise<void> {
    await this.prisma.events_bikes.delete({ where: { id } });
  }
}

// async update(id: number, data: UpdateBikeEventDto): Promise<Response_BikeEvent_Dto | null> {
//   await this.prisma.events_bikes.update({
//     where: { id },
//     data: { ...data, updated_at: new Date() },
//   });
//   return this.findById(id);
// }

// async function run() {
//   const prisma = new PrismaService();

//   try {
//     const repository = new BikeEventRepository(prisma);
//     const result = await repository.findAllByBikeId(95);
//     console.log(result);
//     // console.log(result.action_done_component_map);
//   } catch (error) {
//     console.error('Error fetching bike event:', error);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// run().catch(console.error);
