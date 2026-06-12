import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Response_ComponentGroupDto,
  AssembleBikeComponentsDto,
  Response_MountedComponentsDto,
  Response_ComponentDto,
} from './dto/response-components';
import { CustomComponentsDto } from './dto/create-components';

@Injectable()
export class ComponentService {
  constructor(private readonly prisma: PrismaService) {}

  async createComponentType(dto: CustomComponentsDto): Promise<Response_ComponentDto> {
    return this.prisma.component_types.create({
      data: {
        component_type: dto.component_type,
        component_group_id: dto.component_group_id,
        user_id: dto.user_id,
        ebike: dto.ebike,
        has_position: dto.has_position,
      },
    });
  }

  async getComponentsDefaults(ebike: boolean): Promise<AssembleBikeComponentsDto[]> {
    const componentTypes = await this.prisma.component_types.findMany({
      where: ebike ? {} : { ebike: false },
    });

    return componentTypes.flatMap((type) => {
      const baseComponent: AssembleBikeComponentsDto = {
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
      };

      if (type.has_position) {
        return [
          { component: { ...baseComponent.component, position: 'front' }, component_name: type.component_type },
          { component: { ...baseComponent.component, position: 'rear' }, component_name: type.component_type },
        ];
      }
      return [baseComponent];
    });
  }

  async getMountedComponents(bikeId: string): Promise<Response_MountedComponentsDto[]> {
    return this.prisma.components_mounted.findMany({
      where: { bike_id: +bikeId, is_deleted: false },
      orderBy: { created_at: 'asc' },
    });
  }

  async getAllComponentGroups(): Promise<Response_ComponentGroupDto[]> {
    return this.prisma.component_groups.findMany({});
  }
}
