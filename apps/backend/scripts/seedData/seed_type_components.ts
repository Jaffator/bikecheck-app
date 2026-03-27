import { PrismaClient } from '@prisma/client';
export const components = [
  'Frame',
  'Fork',
  'Shock',
  'Headset',
  'Stem',
  'Handlebar',
  'Saddle',
  'Seatpost',
  'Rims',
  'Tires',
  'Rear Derailleur',
  'Crank',
  'Shifter',
  'Cassette',
  'Chain',
  'Chain Guide',
  'Brakes',
  'Front Hub',
  'Rear Hub',
  'Disc Rotors',
  'Power Meter',
  'Shifters',
  'Brake Levers',
  'Grips',
  'Motor',
  'Battery',
  'Display',
  'Charger',
  'Pedals',
];

export class SeedComponent {
  constructor(private readonly prisma: PrismaClient) {}

  private async componentTypes(data: string[]): Promise<void> {
    try {
      const [, result] = await this.prisma.$transaction([
        this.prisma.component_types.deleteMany({}),
        this.prisma.component_types.createMany({
          data: data.map((component_type) => ({ component_type })),
        }),
      ]);

      console.log(`✅ component_types - seeded OK, inserted: ${result.count}`);
    } catch (error) {
      throw new Error('Failed to seed component_types', { cause: error });
    }
  }

  async run(): Promise<void> {
    await this.componentTypes(components);
  }
}
