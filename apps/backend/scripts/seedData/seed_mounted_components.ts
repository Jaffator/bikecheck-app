import { PrismaClient } from '@prisma/client';
import seedComponenetData from './test_components_list.json';

interface Components {
  component: string;
  desc: string;
}
export class SeedMountedComponents {
  constructor(private readonly prisma?: PrismaClient) {}

  private async componentTypes(seedData: Components[]) {
    try {
      const bikeid = await this.prisma?.bikes.findFirst({
        where: { bike_model: 'Stumpjumper' },
        select: { id: true },
      });
      if (!bikeid) throw new Error('Bike not found');
      const components = await Promise.all(
        seedData.map(async (data) => {
          const componentType = await this.prisma?.component_types.findFirst({
            where: { component_type: data.component },
            select: { id: true },
          });
          if (!componentType) throw new Error(`Component type ${data.component} not found`);

          return {
            component_type_id: componentType.id, // ✅ guaranteed number
            bike_id: bikeid.id,
            component_desc: data.desc,
            total_mileage_km: 1000,
            is_active: true,
            mounted_at: new Date(),
          };
        }),
      );
      const result = await this.prisma?.components_mounted.createMany({
        data: components,
      });
      console.log(`✅ mounted_components - seeded OK, inserted ${result?.count} items`);
    } catch (error) {
      throw new Error('Failed to seed mounted_components', { cause: error });
    }
  }

  async run() {
    await this.componentTypes(seedComponenetData);
  }
}
