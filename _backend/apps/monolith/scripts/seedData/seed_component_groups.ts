import { PrismaClient } from '@prisma/client';
import { toI18nKey } from './i18n_key';

interface Component {
  component_type: string;
  ebike: boolean;
  has_position: boolean;
  // Saved even when left blank, so wear tracking starts on day one. Optional
  // parts are only saved once the user describes them.
  essential: boolean;
}

interface ComponentGroupMapping {
  groupName: string;
  componentTypes: Component[];
}

const componentGroups: ComponentGroupMapping[] = [
  {
    groupName: 'Suspension',
    componentTypes: [
      { component_type: 'Fork', ebike: false, has_position: false, essential: true },
      // Only full-suspension bikes are ever asked for it; the client hides the
      // row for the rest, so it never reaches a hardtail as a blank essential.
      { component_type: 'Shock', ebike: false, has_position: false, essential: true },
    ],
  },
  {
    groupName: 'Frame',
    componentTypes: [
      { component_type: 'Frame', ebike: false, has_position: false, essential: true },
      { component_type: 'Hanger', ebike: false, has_position: false, essential: false },
    ],
  },
  {
    groupName: 'Cockpit',
    componentTypes: [
      { component_type: 'Headset', ebike: false, has_position: false, essential: true },
      { component_type: 'Stem', ebike: false, has_position: false, essential: true },
      { component_type: 'Handlebar', ebike: false, has_position: false, essential: true },
      { component_type: 'Grips', ebike: false, has_position: false, essential: true },
      { component_type: 'Dropper Lever', ebike: false, has_position: false, essential: false },
      { component_type: 'Remote Lever', ebike: false, has_position: false, essential: false },
    ],
  },
  {
    groupName: 'Saddle & Seatpost',
    componentTypes: [
      { component_type: 'Saddle', ebike: false, has_position: false, essential: true },
      { component_type: 'Seatpost', ebike: false, has_position: false, essential: true },
    ],
  },
  {
    groupName: 'Wheels',
    componentTypes: [
      { component_type: 'Rim', ebike: false, has_position: true, essential: true },
      { component_type: 'Tire', ebike: false, has_position: true, essential: true },
      { component_type: 'Hub', ebike: false, has_position: true, essential: true },
      // Often part of the hub rather than a part of its own, so asking for it
      // by default would only add noise.
      { component_type: 'Axle', ebike: false, has_position: true, essential: false },
      { component_type: 'Inserts', ebike: false, has_position: true, essential: false },
      { component_type: 'Valves', ebike: false, has_position: false, essential: false },
      { component_type: 'Sealant', ebike: false, has_position: true, essential: false },
    ],
  },
  {
    groupName: 'Drivetrain',
    componentTypes: [
      { component_type: 'Derailleur', ebike: false, has_position: true, essential: true },
      { component_type: 'Shifter', ebike: false, has_position: true, essential: true },
      { component_type: 'Crank', ebike: false, has_position: false, essential: true },
      { component_type: 'Chainring', ebike: false, has_position: false, essential: true },
      { component_type: 'Bashguard', ebike: false, has_position: false, essential: false },
      { component_type: 'Cassette', ebike: false, has_position: false, essential: true },
      { component_type: 'Chain', ebike: false, has_position: false, essential: true },
      { component_type: 'Chain Guide', ebike: false, has_position: false, essential: false },
      { component_type: 'Bottom Bracket', ebike: false, has_position: false, essential: true },
    ],
  },
  {
    groupName: 'Brakes',
    componentTypes: [
      { component_type: 'Brake Caliper', ebike: false, has_position: true, essential: true },
      { component_type: 'Brake Lever', ebike: false, has_position: true, essential: true },
      { component_type: 'Brake Rotor', ebike: false, has_position: true, essential: true },
      // The fastest-wearing part on the bike, so it is tracked from the start
      // even when the user cannot name the compound.
      { component_type: 'Brake pad', ebike: false, has_position: true, essential: true },
    ],
  },
  {
    groupName: 'E-bike',
    componentTypes: [
      { component_type: 'Motor', ebike: true, has_position: false, essential: false },
      { component_type: 'Battery', ebike: true, has_position: false, essential: false },
      { component_type: 'Display', ebike: true, has_position: false, essential: false },
      { component_type: 'Charger', ebike: true, has_position: false, essential: false },
      { component_type: 'E-Bike System', ebike: true, has_position: false, essential: false },
    ],
  },
  {
    groupName: 'Other',
    componentTypes: [{ component_type: 'Pedals', ebike: false, has_position: false, essential: true }],
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
          i18n_key: toI18nKey('componentGroup', group.groupName),
        })),
      });
      console.log(`✅ Created groups: ${newgroups.length}`);
      for (const group of componentGroups) {
        const groupID = newgroups.find((g) => g.group_name === group.groupName);
        if (!groupID) throw new Error(`Group ID not found for group: ${group.groupName}`);
        const components = group.componentTypes.map((obj) => ({
          ...obj,
          component_group_id: groupID.id,
          i18n_key: toI18nKey('component', obj.component_type),
        }));
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
