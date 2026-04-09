import { PrismaClient } from '@prisma/client';

interface ComponentGroupMapping {
  groupName: string;
  componentTypes: string[];
}

const componentGroupMappings: ComponentGroupMapping[] = [
  {
    groupName: 'Suspension',
    componentTypes: ['Fork', 'Shock'],
  },
  {
    groupName: 'Frame',
    componentTypes: ['Frame', 'Headset', 'Thru Axles'],
  },
  {
    groupName: 'Cockpit',
    componentTypes: ['Handlebar', 'Stem', 'Grips', 'Shifters', 'Brake Levers'],
  },
  {
    groupName: 'Saddle & Seatpost',
    componentTypes: ['Saddle', 'Seatpost'],
  },
  {
    groupName: 'Wheels',
    componentTypes: ['Rims', 'Tires', 'Front Hub', 'Rear Hub'],
  },
  {
    groupName: 'Drivetrain',
    componentTypes: [
      'Rear Derailleur',
      'Front Derailleur',
      'Crank',
      'Shifter',
      'Cassette',
      'Chain',
      'Chain Guide',
      'Bottom Bracket',
    ],
  },
  {
    groupName: 'Brakes',
    componentTypes: ['Brakes', 'Disc Rotors'],
  },
  {
    groupName: 'E-bike',
    componentTypes: ['Motor', 'Battery', 'Display', 'Charger'],
  },
  {
    groupName: 'Other',
    componentTypes: ['Pedals'],
  },
];

export class SeedComponentGroups {
  constructor(private readonly prisma: PrismaClient) {}

  async run(): Promise<void> {
    try {
      console.log('🔄 Seeding component groups...');

      // Delete existing component groups
      await this.prisma.component_groups.deleteMany({});

      // Create component groups and assign them to component types
      for (const mapping of componentGroupMappings) {
        // Create the component group
        const group = await this.prisma.component_groups.create({
          data: {
            group_name: mapping.groupName,
          },
        });

        console.log(`✅ Created group: ${mapping.groupName} (id: ${group.id})`);

        // Update all component types that belong to this group
        for (const componentType of mapping.componentTypes) {
          const result = await this.prisma.component_types.updateMany({
            where: {
              component_type: componentType,
            },
            data: {
              component_group_id: group.id,
            },
          });

          if (result.count > 0) {
            console.log(`  ↳ Assigned "${componentType}" to group "${mapping.groupName}"`);
          } else {
            console.warn(`  ⚠️  Component type "${componentType}" not found`);
          }
        }
      }

      console.log('✅ Component groups seeded successfully');
    } catch (error) {
      console.error('❌ Failed to seed component groups:', error);
      throw error;
    }
  }
}

// Run if executed directly
if (require.main === module) {
  const prisma = new PrismaClient();
  const seeder = new SeedComponentGroups(prisma);

  seeder
    .run()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
