import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActionsComponentsGroupDto, CreateBikeEventDto } from './dto/create-bike-event.dto';
import { UpdateBikeEventDto } from './dto/update-bike-event.dto';
import { ResponseActionsAndComponenetsDto, ResponseBikeEventDto } from './dto/response-bike-event.dto';
import { Prisma } from '@prisma/client';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class BikeEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getActionsOnGroupComponents(dto: ActionsComponentsGroupDto): Promise<ResponseActionsAndComponenetsDto> {
    const group = await this.prisma.component_groups.findUnique({
      where: { id: dto.group_id },
    });
    const actions = await this.prisma.events_action.findMany({
      where: {
        event_action_targets: {
          some: {
            component_types: {
              component_group_id: dto.group_id,
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
                    bike_id: dto.bike_id,
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
    console.log(actionsOnGroupComponents);
    return actionsOnGroupComponents;
  }

  async create(data: CreateBikeEventDto, db: DbClient = this.prisma): Promise<ResponseBikeEventDto> {
    return await db.events_bikes.create({ data });
  }

  async findAll(): Promise<ResponseBikeEventDto[]> {
    return await this.prisma.events_bikes.findMany({
      where: { is_deleted: false },
      orderBy: { created_at: 'desc' },
    });
  }

  async findById(id: number): Promise<ResponseBikeEventDto | null> {
    return await this.prisma.events_bikes.findUnique({
      where: { id, is_deleted: false },
    });
  }

  async findByBikeId(bikeId: number): Promise<ResponseBikeEventDto[]> {
    return await this.prisma.events_bikes.findMany({
      where: { bike_id: bikeId, is_deleted: false },
      orderBy: { created_at: 'desc' },
    });
  }

  async update(id: number, data: UpdateBikeEventDto): Promise<ResponseBikeEventDto> {
    return await this.prisma.events_bikes.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
    });
  }

  async softDelete(id: number): Promise<ResponseBikeEventDto> {
    return await this.prisma.events_bikes.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
    });
  }

  async hardDelete(id: number): Promise<ResponseBikeEventDto> {
    return await this.prisma.events_bikes.delete({ where: { id } });
  }
}
