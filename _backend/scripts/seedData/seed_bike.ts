import { PrismaClient } from '@prisma/client';
// import { bikes } from '@prisma/client';

export class SeedBike {
  constructor(private readonly prisma: PrismaClient) {}

  private async bike(): Promise<void> {
    const brand = await this.prisma.bike_brands.findFirst({
      where: { bike_brand: 'Specialized' },
    });
    const biketypeid = await this.prisma.bike_types.findFirst({
      where: { type: 'Enduro' },
      select: { id: true },
    });
    const wheelsizeid = await this.prisma.wheel_sizes.findFirst({
      where: { size: '29"' },
      select: { id: true },
    });
    const bikesizeid = await this.prisma.bike_sizes.findFirst({
      where: { size: 'L' },
      select: { id: true },
    });
    const userid = await this.prisma.users.findFirst({});

    const bike = {
      organization_id: null,
      user_id: userid!.id,
      bike_brand: brand?.bike_brand || '',
      bike_model: 'Stumpjumper',
      bike_type_id: biketypeid?.id,
      year: 2023,
      wheel_size_id: wheelsizeid?.id,
      bike_size_id: bikesizeid?.id,
      mileage_km: 1000,
      frame_material: 'Carbon',
      bikename: 'My awesome bike',
      description:
        'This is my awesome bike. I love it so much. It is the best bike in the world. I have ridden it on many trails and it has never let me down. It is fast, light, and durable. I highly recommend it to anyone looking for a new bike.',
    };
    try {
      const result = await this.prisma.bikes.create({
        data: bike,
      });
      console.log(`✅ bike - seeded OK ${result.bike_brand} ${result.bike_model}`);
    } catch (error) {
      throw new Error('Failed to seed bike', { cause: error });
    }
  }
  async run(): Promise<void> {
    await this.bike();
  }
}
