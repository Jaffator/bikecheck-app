import { PrismaClient } from '@prisma/client';
export const components = [
  // Suspension
  { component_type: 'Fork', component_group_name: 'Suspension', ebike: false, has_position: false },
  { component_type: 'Shock', component_group_name: 'Suspension', ebike: false, has_position: false },
  // Frame
  { component_type: 'Frame', component_group_name: 'Frame', ebike: false, has_position: false },
  { component_type: 'Hanger', component_group_name: 'Frame', ebike: false, has_position: false },
  // Cockpit
  { component_type: 'Headset', component_group_name: 'Cockpit', ebike: false, has_position: false },
  { component_type: 'Stem', component_group_name: 'Cockpit', ebike: false, has_position: false },
  { component_type: 'Handlebar', component_group_name: 'Cockpit', ebike: false, has_position: false },
  { component_type: 'Grips', component_group_name: 'Cockpit', ebike: false, has_position: false },
  { component_type: 'Dropper Lever', component_group_name: 'Cockpit', ebike: false, has_position: false },
  { component_type: 'Remote Lever', component_group_name: 'Cockpit', ebike: false, has_position: false },
  // Saddle & Seatpost
  { component_type: 'Saddle', component_group_name: 'Saddle & Seatpost', ebike: false, has_position: false },
  { component_type: 'Seatpost', component_group_name: 'Saddle & Seatpost', ebike: false, has_position: false },
  // Wheels
  { component_type: 'Rim', component_group_name: 'Wheels', ebike: false, has_position: true },
  { component_type: 'Tire', component_group_name: 'Wheels', ebike: false, has_position: true },
  { component_type: 'Hub', component_group_name: 'Wheels', ebike: false, has_position: true },
  { component_type: 'Axle', component_group_name: 'Wheels', ebike: false, has_position: true },
  { component_type: 'Inserts', component_group_name: 'Wheels', ebike: false, has_position: true },
  { component_type: 'Valves', component_group_name: 'Wheels', ebike: false, has_position: false },
  { component_type: 'Sealant', component_group_name: 'Wheels', ebike: false, has_position: true },
  // Drivetrain
  { component_type: 'Derailleur', component_group_name: 'Drivetrain', ebike: false, has_position: true },
  { component_type: 'Shifter', component_group_name: 'Drivetrain', ebike: false, has_position: true },
  { component_type: 'Crank', component_group_name: 'Drivetrain', ebike: false, has_position: false },
  { component_type: 'Chainring', component_group_name: 'Drivetrain', ebike: false, has_position: false },
  { component_type: 'Bashguard', component_group_name: 'Drivetrain', ebike: false, has_position: false },
  { component_type: 'Cassette', component_group_name: 'Drivetrain', ebike: false, has_position: false },
  { component_type: 'Chain', component_group_name: 'Drivetrain', ebike: false, has_position: false },
  { component_type: 'Chain Guide', component_group_name: 'Drivetrain', ebike: false, has_position: false },
  { component_type: 'Bottom Bracket', component_group_name: 'Drivetrain', ebike: false, has_position: false },
  // Brakes
  { component_type: 'Brake Caliper', component_group_name: 'Brakes', ebike: false, has_position: true },
  { component_type: 'Brake Lever', component_group_name: 'Brakes', ebike: false, has_position: true },
  { component_type: 'Brake Rotor', component_group_name: 'Brakes', ebike: false, has_position: true },
  { component_type: 'Brake pad', component_group_name: 'Brakes', ebike: false, has_position: true },
  // E-bike
  { component_type: 'Motor', component_group_name: 'E-bike', ebike: true, has_position: false },
  { component_type: 'Battery', component_group_name: 'E-bike', ebike: true, has_position: false },
  { component_type: 'Display', component_group_name: 'E-bike', ebike: true, has_position: false },
  { component_type: 'Charger', component_group_name: 'E-bike', ebike: false, has_position: false },
  { component_type: 'E-Bike System', component_group_name: 'E-bike', ebike: true, has_position: false },
  // Other
  { component_type: 'Pedals', component_group_name: 'Other', ebike: false, has_position: false },
];

export class SeedComponent {
  constructor(private readonly prisma: PrismaClient) {}

  private async componentTypes(data: string[]): Promise<void> {

    try {
      const componenetsMap = components.map((comp) => )
      const [, result] = await this.prisma.$transaction([
        this.prisma.component_types.deleteMany({}),
        this.prisma.component_types.createMany({}),
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
