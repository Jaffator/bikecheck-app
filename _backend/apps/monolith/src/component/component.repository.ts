import { Injectable } from '@nestjs/common';
import 'dotenv/config';
import { Prisma, components_mounted } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AssembleBikeComponentsDto, Response_ComponentDto } from './dto/response-components';
import { CustomComponentsDto } from './dto/create-components';
type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class ComponentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns default component structure for manual bike creation
   * Used when external component data is not available
   * @param ebike If false, return only non-ebike components. If true, return all components.
   */
  async getDefaultComponents(ebike: boolean): Promise<AssembleBikeComponentsDto[]> {
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
          total_mileage_km: 0,
          is_active: true,
          note: null,
          position: undefined,
          interval_id: undefined,
          brake_load_since_service: undefined,
          last_serviced_at: null,
        },
        component_name: type.component_type,
      };

      // Components with position (brakes, wheels, etc.) return front + rear
      if (type.has_position) {
        return [
          {
            component: { ...baseComponent.component, position: 'front' },
            component_name: type.component_type,
          },
          {
            component: { ...baseComponent.component, position: 'rear' },
            component_name: type.component_type,
          },
        ];
      }
      return [baseComponent];
    });
  }

  async createComponentType(dto: CustomComponentsDto): Promise<Response_ComponentDto> {
    return await this.prisma.component_types.create({
      data: {
        component_type: dto.component_type,
        component_group_id: dto.component_group_id,
        user_id: dto.user_id,
        ebike: dto.ebike,
        has_position: dto.has_position,
      },
    });
  }

  async createMountedComponentMany(
    data: Prisma.components_mountedCreateManyInput[],
    db: DbClient = this.prisma,
  ): Promise<{ count: number }> {
    return db.components_mounted.createMany({ data });
  }

  async findMountedComponentsByBikeId(bikeId: number): Promise<components_mounted[]> {
    return this.prisma.components_mounted.findMany({
      where: { bike_id: bikeId, is_deleted: false },
      orderBy: { created_at: 'asc' },
    });
  }

  async updateMountedComponent(id: number, data: Prisma.components_mountedUpdateInput): Promise<components_mounted> {
    return this.prisma.components_mounted.update({
      where: { id },
      data,
    });
  }
  async getAllComponentGroups() {
    return await this.prisma.component_groups.findMany({});
  }

  async getAllComponentTypes() {
    return await this.prisma.component_types.findMany({});
  }

  async createMountedComponent(data: Prisma.components_mountedCreateInput): Promise<components_mounted> {
    return await this.prisma.components_mounted.create({ data });
  }

  async softDeleteMountedComponent(id: number): Promise<components_mounted> {
    return this.prisma.components_mounted.update({
      where: { id },
      data: {
        is_deleted: true,
        is_active: false,
        deleted_at: new Date(),
      },
    });
  }
}

// async function run() {
//   const prisma = new PrismaService();
//   await prisma.onModuleInit();

//   try {
//     const repository = new ComponentRepository(prisma);
//   } finally {
//     await prisma.onModuleDestroy();
//   }
// }

// run().catch(console.error);
