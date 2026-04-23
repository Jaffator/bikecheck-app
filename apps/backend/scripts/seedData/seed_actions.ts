/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { PrismaClient } from '@prisma/client';
import seedData from './seed_data.json';

export class SeedActions {
  constructor(private readonly prisma: PrismaClient) {}

  private actions() {
    try {
      Object.entries(seedData.actions).forEach(([group, actions]) => {
        actions.forEach(async (event: any) => {
          //  Save action and get id
          const save_action = await this.prisma.events_action.create({
            data: {
              action_name: event.action,
              replace_action: event.replace,
            },
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
            });
          }

          // Make action Tags relations
          if (event.tags) {
            await this.prisma.event_action_tags.createMany({
              data: event.tags.map((tag: string) => ({
                event_action_id: save_action.id,
                event_action_tag: tag,
              })),
            });
          }
        });
      });
      console.log(`✅ actions - seeded OK`);
    } catch (error) {
      console.error('Error seeding actions:', error);
    }
  }

  run() {
    this.actions();
  }
}
