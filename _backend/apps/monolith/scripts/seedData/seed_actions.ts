import { PrismaClient } from '@prisma/client';
import { SeedData } from './seed_data.types';
import seedDatJson from './seed_data.json';

const seedData: SeedData = seedDatJson as SeedData;

export class SeedActions {
  constructor(private readonly prisma: PrismaClient) {}

  private async actions(): Promise<void> {
    try {
      for (const [, actions] of Object.entries(seedData.actions)) {
        for (const event of actions as any[]) {
          //  Save action and get id
          const save_action = await this.prisma.events_action.upsert({
            where: { action_name: event.action },
            create: { action_name: event.action, replace_action: event.replace },
            update: { replace_action: event.replace },
          });
          // Targets releated to define action targets relations
          if (event.targets) {
            const targets = await this.prisma.component_types.findMany({
              where: { component_type: { in: event.targets } },
            });
            if (targets.length !== event.targets.length) {
              throw new Error(
                `Some targets not found for action ${event.action}. Found: ${targets.map((t) => t.component_type).join(', ')}, expected: ${event.targets.join(', ')}`,
              );
            }

            // Make action Targets relations
            await this.prisma.event_action_targets.createMany({
              data: targets.map((target) => ({
                event_action_id: save_action.id,
                component_type_id: target.id,
              })),
              skipDuplicates: true,
            });
          }

          // Make action Tags relations
          if (event.tags) {
            await this.prisma.event_action_tags.createMany({
              data: event.tags.map((tag: string) => ({
                event_action_id: save_action.id,
                event_action_tag: tag,
              })),
              skipDuplicates: true,
            });
          }
          if (event.intervals) {
            await this.prisma.action_service_intervals.deleteMany({
              where: { event_actions_id: save_action.id },
            });
            await this.prisma.action_service_intervals.createMany({
              data: event.intervals.map((interval: any) => ({
                event_actions_id: save_action.id,
                service_interval_km: interval.service_interval_km,
                service_interval_min: interval.service_interval_min,
                health_index_interval: interval.health_index_interval,
                category: interval.category ?? [],
              })),
            });
          }
        }
      }
      console.log(`✅ actions - seeded OK`);
    } catch (error) {
      console.error('Error seeding actions:', error);
    }
  }

  async run(): Promise<void> {
    await this.actions();
  }
}
