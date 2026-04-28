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
  // -------------------- Create new bike event --------------------
  // ---------------------------------------------------------------
  async create(data: Create_BikeEventDto): Promise<Response_BikeEvent_Dto> {
    return await this.prisma.$transaction(async (tx) => {
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

      // 3. Component replacements – deactivate old component, create new component, log action with part_replaced = true
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

      // 4. Load the result with relations
      const createdBikeEvent = await tx.events_bikes.findUniqueOrThrow({
        where: { id: bikeEvent.id },
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

      // 5. Mapuj na response DTO
      return {
        id: createdBikeEvent.id,
        bike_id: createdBikeEvent.bike_id!,
        note: createdBikeEvent.note ?? undefined,
        total_cost: Number(createdBikeEvent.total_cost),
        created_at: createdBikeEvent.created_at!,
        updated_at: createdBikeEvent.updated_at ?? undefined,
        actions_done: createdBikeEvent.event_actions_done.map((actionDone) => ({
          action_id: actionDone.event_action_id,
          action_name: actionDone.events_action!.action_name,
          partial_cost: Number(actionDone.partial_cost),
          replace_action: actionDone.events_action!.replace_action,
          note: actionDone.note,
          mounted_components: actionDone.action_done_component_map.map((junc) => ({
            id: junc.components_mounted.id,
            component_desc: junc.components_mounted.component_desc,
            position: junc.components_mounted.position,
            component_type: junc.components_mounted.component_types.component_type,
          })),
        })),
      };
    });
  }

  private async mapBikeEvent() {
    // bike event
    // actions done
    // mounted components involved in actions
    // replaced components
    // attachments
  }

  async findById(bikeEvent_id: number) {
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
      },
    });

    console.log(bikeEvent);
  }

  // async findAll(): Promise<Response_BikeEvent_Dto[]> {
  //   return await this.prisma.events_bikes.findMany({
  //     where: { is_deleted: false },
  //     orderBy: { created_at: 'desc' },
  //   });
  // }

  // async findByBikeId(bikeId: number): Promise<Response_BikeEvent_Dto[]> {
  //   return await this.prisma.events_bikes.findMany({
  //     where: { bike_id: bikeId, is_deleted: false },
  //     orderBy: { created_at: 'desc' },
  //   });
  // }

  // async update(id: number, data: UpdateBikeEventDto): Promise<Response_BikeEvent_Dto> {
  //   return await this.prisma.events_bikes.update({
  //     where: { id },
  //     data: { ...data, updated_at: new Date() },
  //   });
  // }

  // async softDelete(id: number): Promise<Response_BikeEvent_Dto> {
  //   return await this.prisma.events_bikes.update({
  //     where: { id },
  //     data: {
  //       is_deleted: true,
  //       deleted_at: new Date(),
  //     },
  //   });
  // }

  // async hardDelete(id: number): Promise<Response_BikeEvent_Dto> {
  //   return await this.prisma.events_bikes.delete({ where: { id } });
  // }
}

// async function run() {
//   const prisma = new PrismaService();

//   try {
//     const repository = new BikeEventRepository(prisma);
//     // const result = await repository.findById(2);
//     const newEvent = await repository.create({
//       bike_id: 95,
//       total_cost: 150,
//       note: 'Replaced chain and cleaned drivetrain',
//       actions_done: [
//         {
//           action_id: 1,
//           description: 'Replaced chain',
//           partial_cost: 100,
//           part_replaced: true,
//           mounted_components_involved: [45], // Assuming this is the ID of the new component
//         },
//         {
//           action_id: 2,
//           description: 'Cleaned drivetrain',
//           partial_cost: 50,
//           part_replaced: false,
//           mounted_components_involved: [46], // Assuming this is the ID of the new component
//         },
//       ],
//     });
//     console.log(newEvent);
//   } catch (error) {
//     console.error('Error fetching bike event:', error);
//   } finally {
//     await prisma.onModuleDestroy();
//   }
// }

// run().catch(console.error);
