import { PrismaClient } from '@prisma/client';

interface Component {
  component_type: string;
  ebike: boolean;
  has_position: boolean;
}

interface ComponentGroupMapping {
  groupName: string;
  componentTypes: Component[];
}

const componentGroups: ComponentGroupMapping[] = [
  {
    groupName: 'Suspension',
    componentTypes: [
      { component_type: 'Fork', ebike: false, has_position: false },
      { component_type: 'Shock', ebike: false, has_position: false },
    ],
  },
  {
    groupName: 'Frame',
    componentTypes: [
      { component_type: 'Frame', ebike: false, has_position: false },
      { component_type: 'Hanger', ebike: false, has_position: false },
    ],
  },
  {
    groupName: 'Cockpit',
    componentTypes: [
      { component_type: 'Headset', ebike: false, has_position: false },
      { component_type: 'Stem', ebike: false, has_position: false },
      { component_type: 'Handlebar', ebike: false, has_position: false },
      { component_type: 'Grips', ebike: false, has_position: false },
      { component_type: 'Dropper Lever', ebike: false, has_position: false },
      { component_type: 'Remote Lever', ebike: false, has_position: false },
    ],
  },
  {
    groupName: 'Saddle & Seatpost',
    componentTypes: [
      { component_type: 'Saddle', ebike: false, has_position: false },
      { component_type: 'Seatpost', ebike: false, has_position: false },
    ],
  },
  {
    groupName: 'Wheels',
    componentTypes: [
      { component_type: 'Rim', ebike: false, has_position: true },
      { component_type: 'Tire', ebike: false, has_position: true },
      { component_type: 'Hub', ebike: false, has_position: true },
      { component_type: 'Axle', ebike: false, has_position: true },
      { component_type: 'Inserts', ebike: false, has_position: true },
      { component_type: 'Valves', ebike: false, has_position: false },
      { component_type: 'Sealant', ebike: false, has_position: true },
    ],
  },
  {
    groupName: 'Drivetrain',
    componentTypes: [
      { component_type: 'Derailleur', ebike: false, has_position: true },
      { component_type: 'Shifter', ebike: false, has_position: true },
      { component_type: 'Crank', ebike: false, has_position: false },
      { component_type: 'Chainring', ebike: false, has_position: false },
      { component_type: 'Bashguard', ebike: false, has_position: false },
      { component_type: 'Cassette', ebike: false, has_position: false },
      { component_type: 'Chain', ebike: false, has_position: false },
      { component_type: 'Chain Guide', ebike: false, has_position: false },
      { component_type: 'Bottom Bracket', ebike: false, has_position: false },
    ],
  },
  {
    groupName: 'Brakes',
    componentTypes: [
      { component_type: 'Brake Caliper', ebike: false, has_position: true },
      { component_type: 'Brake Lever', ebike: false, has_position: true },
      { component_type: 'Brake Rotor', ebike: false, has_position: true },
      { component_type: 'Brake pad', ebike: false, has_position: true },
    ],
  },
  {
    groupName: 'E-bike',
    componentTypes: [
      { component_type: 'Motor', ebike: true, has_position: false },
      { component_type: 'Battery', ebike: true, has_position: false },
      { component_type: 'Display', ebike: true, has_position: false },
      { component_type: 'Charger', ebike: false, has_position: false },
      { component_type: 'E-Bike System', ebike: true, has_position: false },
    ],
  },
  {
    groupName: 'Other',
    componentTypes: [{ component_type: 'Pedals', ebike: false, has_position: false }],
  },
];

// for (const group of componentGroups) {
//   const comp = group.componentTypes.map((g) => ({ ...g, component_group_id: 1 }));
//   console.log(comp);
// }

export class SeedComponentGroups {
  constructor(private readonly prisma: PrismaClient) {}

  async run(): Promise<void> {
    try {
      console.log('🔄 Seeding component groups...');

      // Delete existing component groups
      await this.prisma.component_groups.deleteMany({});

      // Create Groups
      const newgroups = await this.prisma.component_groups.createManyAndReturn({
        data: componentGroups.map((group) => ({
          group_name: group.groupName,
        })),
      });
      console.log(`✅ Created groups: ${newgroups.length}`);
      for (const group of componentGroups) {
        const groupID = newgroups.find((g) => g.group_name === group.groupName);
        if (!groupID) throw new Error(`Group ID not found for group: ${group.groupName}`);
        const components = group.componentTypes.map((obj) => ({ ...obj, component_group_id: groupID.id }));
        await this.prisma.component_types.createMany({
          data: components,
        });
      }
      console.log(`✅ Created components for all groups`);
    } catch (error) {
      console.error('❌ Failed to seed component groups:', error);
      throw error;
    }
  }
}

// // Run if executed directly
// if (require.main === module) {
//   const prisma = new PrismaClient();
//   const seeder = new SeedComponentGroups(prisma);

//   seeder
//     .run()
//     .then(async () => {
//       await prisma.$disconnect();
//       process.exit(0);
//     })
//     .catch(async (error) => {
//       console.error(error);
//       await prisma.$disconnect();
//       process.exit(1);
//     });
// }
