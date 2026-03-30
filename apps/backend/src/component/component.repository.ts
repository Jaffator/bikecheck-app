import { Injectable } from '@nestjs/common';
import 'dotenv/config';
import { Prisma, components_mounted } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ComponentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMountedComponentMany(data: Prisma.components_mountedCreateManyInput[]): Promise<{ count: number }> {
    return this.prisma.components_mounted.createMany({ data });
  }

  async findMountedByBikeId(bikeId: number): Promise<components_mounted[]> {
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

async function run() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  try {
    const repository = new ComponentRepository(prisma);
    const result = await repository.updateMountedComponent(85, {
      total_mileage_km: 1500,
      component_desc: 'Updated description',
    });
    console.log(result);
  } finally {
    await prisma.onModuleDestroy();
  }
}

run().catch(console.error);
