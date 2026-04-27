import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Create_BikeEventDto } from './dto/create-bike-event.dto';
import { UpdateBikeEventDto } from './dto/update-bike-event.dto';
import { Response_ActionsOnGroup_Dto, Response_BikeEvent_Dto } from './dto/response-bike-event.dto';

@Injectable()
export class BikeEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Based on GroupID and BikeID het all actions
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

  // Create new bike event
  async create(data: Create_BikeEventDto): Promise<Response_BikeEvent_Dto> {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Vytvoř bike event
      const bikeEvent = await tx.events_bikes.create({
        data: {
          bike_id: data.bike_id,
          note: data.note,
          total_cost: data.total_cost,
        },
      });

      // 2. Servisní akce – jedna events_components na každou zapojenou komponentu
      if (data.actions_done?.length) {
        const rows = data.actions_done.flatMap((action) =>
          action.mounted_components_involved.map((componentId) => ({
            bike_event_id: bikeEvent.id,
            event_action_id: action.action_id,
            component_mounted_id: componentId,
            note: action.description,
            partial_cost: action.partial_cost,
            part_replaced: false,
          })),
        );
        await tx.events_components.createMany({ data: rows });
      }

      // 3. Výměny komponent
      if (data.actions_replaced?.length) {
        for (const replacement of data.actions_replaced) {
          // Deaktivuj starou komponentu
          await tx.components_mounted.update({
            where: { id: replacement.old_component_mounted_id },
            data: { is_active: false },
          });

          // Vytvoř novou komponentu
          const newComponent = await tx.components_mounted.create({
            data: {
              bike_id: data.bike_id,
              component_type_id: replacement.component_type_id,
              component_desc: replacement.new_component_desc,
              is_active: true,
            },
          });

          // Zaloguj výměnu jako akci
          await tx.events_components.create({
            data: {
              bike_event_id: bikeEvent.id,
              event_action_id: replacement.action_id,
              component_mounted_id: newComponent.id,
              note: replacement.note,
              partial_cost: replacement.partial_cost ?? 0,
              part_replaced: true,
            },
          });
        }
      }

      // 4. Načti výsledek s relacemi
      const created = await tx.events_bikes.findUniqueOrThrow({
        where: { id: bikeEvent.id },
        include: {
          events_components: {
            include: {
              events_action: {
                include: { event_action_tags: true },
              },
              components_mounted: {
                include: { component_types: true },
              },
            },
          },
        },
      });

      // 5. Seskup events_components podle action_id → ActionDto[]
      type ActionEntry = {
        id: number;
        action_name: string;
        replace_action: boolean;
        event_action_tags: { event_action_tag: string }[];
        components: { id: number; component_desc: string | null; position: string | null; component_type: string }[];
      };
      const actionMap = new Map<number, ActionEntry>();

      for (const comp of created.events_components) {
        const actionId = comp.event_action_id;
        if (!actionMap.has(actionId)) {
          actionMap.set(actionId, {
            id: comp.events_action.id,
            action_name: comp.events_action.action_name,
            replace_action: comp.events_action.replace_action,
            event_action_tags: comp.events_action.event_action_tags,
            components: [],
          });
        }
        actionMap.get(actionId)!.components.push({
          id: comp.component_mounted_id,
          component_desc: comp.components_mounted.component_desc,
          position: comp.components_mounted.position,
          component_type: comp.components_mounted.component_types.component_type,
        });
      }

      return {
        id: created.id,
        bike_id: created.bike_id!,
        note: created.note ?? undefined,
        total_cost: Number(created.total_cost),
        created_at: created.created_at!,
        updated_at: created.updated_at ?? undefined,
        actions: Array.from(actionMap.values()).map((action) => ({
          id: action.id,
          action_name: action.action_name,
          replace_action: action.replace_action,
          tags: action.event_action_tags.map((t) => t.event_action_tag),
          components: action.components,
        })),
      };
    });
  }

  // async findAll(): Promise<Response_BikeEvent_Dto[]> {
  //   return await this.prisma.events_bikes.findMany({
  //     where: { is_deleted: false },
  //     orderBy: { created_at: 'desc' },
  //   });
  // }

  // async findById(id: number): Promise<Response_BikeEvent_Dto | null> {
  //   return await this.prisma.events_bikes.findUnique({
  //     where: { id, is_deleted: false },
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
