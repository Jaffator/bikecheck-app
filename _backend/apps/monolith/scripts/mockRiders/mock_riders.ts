import { PrismaClient, Prisma, follow_status } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { buildNotificationText } from '../../src/notification/notification-texts';
import { NotificationType } from '../../src/notification/notification-types.config';
import { BikePlan, MOCK_RIDER_PASSWORD, MOCK_RIDERS, PartPlan, RiderPlan, ServicePlan } from './mock_riders.plan';

// The rounds the app registers a user with.
const PASSWORD_SALT_ROUNDS = 10;

// Each part only wears on the axes that belong to it - see strava.service.ts.
const DRIVETRAIN_TYPES: string[] = ['Chain', 'Cassette', 'Chainring'];
const SUSPENSION_TYPES: string[] = ['Fork', 'Shock'];
const BRAKE_PAD_TYPE = 'Brake pad';

// Nothing here was ridden, so every axis is derived from the kilometres alone.
const MIN_PER_KM = 3.5;
const DRIVETRAIN_SHARE = 0.7;
const SUSPENSION_SHARE = 0.35;
const BRAKE_INDEX_PER_KM = 25;

const DAY_MS = 24 * 60 * 60 * 1000;

type FollowNotice = Extract<NotificationType, 'new_follower' | 'follow_request' | 'follow_accepted'>;
const FOLLOW_NOTICES: FollowNotice[] = ['new_follower', 'follow_request', 'follow_accepted'];

// The accumulators of one part, named as the columns are.
interface Wear {
  total_km: number;
  total_time_min: number;
  drivetrain_km: number;
  suspension_min: number;
  health_index: number;
}

interface Catalogue {
  bikeTypeIds: Map<string, number>;
  componentTypeIds: Map<string, number>;
  actionIds: Map<string, number>;
}

// The tester's own account, the one the mock riders follow.
interface Me {
  id: number;
  language: string | null;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

function wearOf(componentType: string, km: number): Wear {
  const minutes = Math.round(km * MIN_PER_KM);
  return {
    total_km: km,
    total_time_min: minutes,
    drivetrain_km: DRIVETRAIN_TYPES.includes(componentType) ? Math.round(km * DRIVETRAIN_SHARE) : 0,
    suspension_min: SUSPENSION_TYPES.includes(componentType) ? Math.round(minutes * SUSPENSION_SHARE) : 0,
    health_index: componentType === BRAKE_PAD_TYPE ? km * BRAKE_INDEX_PER_KM : 0,
  };
}

function hasPart(plan: BikePlan, componentType: string): boolean {
  return plan.parts.some((planned) => planned.component_type === componentType);
}

// A replaced part went on the day of its Replacement; every other part came with the bike.
function mountedAt(plan: BikePlan, partKey: string): Date {
  const swap = plan.services.find((service) =>
    service.actions.some((action) => action.replacement && action.part_keys.includes(partKey)),
  );
  return daysAgo(swap ? swap.days_ago : plan.owned_days);
}

// Null when nobody wrote a price down, so the Service shows no cost instead of zero.
function totalCost(service: ServicePlan): number | null {
  const costs = service.actions.flatMap((action) => (action.cost === null ? [] : [action.cost]));
  return costs.length ? costs.reduce((sum, cost) => sum + cost, 0) : null;
}

// The Wear Baseline: zero on the part a Replacement put on, else what it carried that day.
function baseline(
  planned: PartPlan,
  service: ServicePlan,
  isReplacement: boolean,
): Omit<Prisma.action_done_component_mapUncheckedCreateInput, 'event_action_done_id' | 'component_mounted_id'> {
  const wear = wearOf(planned.component_type, isReplacement ? 0 : Math.max(0, planned.km - service.km_ago));
  return {
    km_at_time: wear.total_km,
    time_min_at_time: wear.total_time_min,
    drivetrain_km_at_time: wear.drivetrain_km,
    suspension_min_at_time: wear.suspension_min,
  };
}

// The same key follow.service.ts writes, so accepting a seeded request resolves its notice.
function noticeKey(type: FollowNotice, counterpartId: number): string {
  return `${type}:${String(counterpartId)}`;
}

export class BuildMockRiders {
  private photoCursor = 0;

  constructor(private readonly prisma: PrismaClient) {}

  // Thrown away and built again, never patched. Without an email no follow row is written.
  async run(myEmail: string | null): Promise<void> {
    const me = myEmail === null ? null : await this.findMe(myEmail);
    const catalogue = await this.readCatalogue();
    await this.clean();
    const photos = await this.borrowedPhotos();
    const passwordHash = await bcrypt.hash(MOCK_RIDER_PASSWORD, PASSWORD_SALT_ROUNDS);

    for (const [index, rider] of MOCK_RIDERS.entries()) {
      const riderId = await this.createRider(rider, passwordHash);
      for (const plan of rider.bikes) {
        await this.createBike(plan, riderId, catalogue, this.nextPhoto(photos));
      }
      if (me && rider.follows_me) await this.followMe(riderId, rider, rider.follows_me, me, index + 1);

      console.log(`  ${rider.email} @${rider.handle} ${rider.visibility}: ${rider.bikes.length} bikes`);
    }

    console.log(`mock riders rebuilt - password "${MOCK_RIDER_PASSWORD}", ${photos.length} photos borrowed`);
    if (!me) console.log('no email given - nobody follows you; pass yours to seed followers and requests');
  }

  // Removes the riders and the follow notices they left in anybody's bell.
  async clean(): Promise<void> {
    const riders = await this.prisma.users.findMany({
      where: { email: { in: MOCK_RIDERS.map((rider) => rider.email) } },
      select: { id: true },
    });
    const ids = riders.map((rider) => rider.id);
    if (!ids.length) return;

    const keys = ids.flatMap((id) => FOLLOW_NOTICES.map((type) => noticeKey(type, id)));
    await this.prisma.notifications.deleteMany({ where: { dedup_key: { in: keys } } });
    // Bikes go first, as in the eval account: they do not cascade from the user.
    await this.prisma.bikes.deleteMany({ where: { user_id: { in: ids } } });
    await this.prisma.users.deleteMany({ where: { id: { in: ids } } });
    console.log(`removed ${ids.length} mock riders`);
  }

  // Fails before anything is touched, so a typo in the email costs nothing.
  private async findMe(email: string): Promise<Me> {
    if (MOCK_RIDERS.some((rider) => rider.email === email)) {
      throw new Error(`${email} is a mock rider, pass your own account`);
    }
    const me = await this.prisma.users.findUnique({ where: { email }, select: { id: true, language: true } });
    if (!me) throw new Error(`No account with the email ${email}`);
    return me;
  }

  // The riders sit on the catalogue the app seeds; a missing name is reported by name.
  private async readCatalogue(): Promise<Catalogue> {
    const bikes = MOCK_RIDERS.flatMap((rider) => rider.bikes);
    const bikeTypes = bikes.map((plan) => plan.bike_type);
    const componentTypes = bikes.flatMap((plan) => plan.parts.map((planned) => planned.component_type));
    const actions = bikes.flatMap((plan) =>
      plan.services.flatMap((service) => service.actions.map((action) => action.action_name)),
    );

    const bikeTypeRows = await this.prisma.bike_types.findMany({
      where: { type: { in: bikeTypes } },
      select: { id: true, type: true },
    });
    const componentTypeRows = await this.prisma.component_types.findMany({
      where: { component_type: { in: componentTypes }, user_id: null, is_deleted: { not: true } },
      select: { id: true, component_type: true },
    });
    const actionRows = await this.prisma.events_action.findMany({
      where: { action_name: { in: actions } },
      select: { id: true, action_name: true },
    });

    const catalogue: Catalogue = {
      bikeTypeIds: new Map(bikeTypeRows.map((row) => [row.type ?? '', row.id])),
      componentTypeIds: new Map(componentTypeRows.map((row) => [row.component_type, row.id])),
      actionIds: new Map(actionRows.map((row) => [row.action_name, row.id])),
    };

    const missing = [
      ...bikeTypes.filter((name) => !catalogue.bikeTypeIds.has(name)).map((name) => `bike type "${name}"`),
      ...componentTypes
        .filter((name) => !catalogue.componentTypeIds.has(name))
        .map((name) => `component type "${name}"`),
      ...actions.filter((name) => !catalogue.actionIds.has(name)).map((name) => `action "${name}"`),
    ];
    if (missing.length) {
      throw new Error(`The catalogue is not seeded, missing: ${[...new Set(missing)].join(', ')}`);
    }
    return catalogue;
  }

  // Photos real bikes already have in storage - read after the clean, so never a mock's own.
  private async borrowedPhotos(): Promise<string[]> {
    const rows = await this.prisma.bikes.findMany({
      where: { image_url: { not: null } },
      select: { image_url: true },
      distinct: ['image_url'],
      orderBy: { id: 'asc' },
    });
    return rows.flatMap((row) => (row.image_url ? [row.image_url] : []));
  }

  private nextPhoto(photos: string[]): string | null {
    if (!photos.length) return null;
    const photo = photos[this.photoCursor % photos.length];
    this.photoCursor += 1;
    return photo;
  }

  // Verified and with a password, so the rider can be signed in as. No avatar on purpose.
  private async createRider(rider: RiderPlan, passwordHash: string): Promise<number> {
    const joined = daysAgo(Math.max(...rider.bikes.map((plan) => plan.owned_days)));
    const user = await this.prisma.users.create({
      data: {
        email: rider.email,
        name: rider.name,
        password_hash: passwordHash,
        is_active: true,
        language: 'cs',
        currency: 'CZK',
        weight_kg: 78,
        tire_pressure_unit: rider.tire_pressure_unit,
        email_verified_at: joined,
        created_at: joined,
        public_profile: {
          create: {
            handle: rider.handle,
            visibility: rider.visibility,
            share_components: rider.share_components,
            share_setup: rider.share_setup,
            share_history: rider.share_history,
            share_costs: rider.share_costs,
            view_count: rider.view_count,
            created_at: joined,
            updated_at: joined,
          },
        },
      },
      select: { id: true },
    });
    return user.id;
  }

  private async createBike(
    plan: BikePlan,
    userId: number,
    catalogue: Catalogue,
    imageUrl: string | null,
  ): Promise<void> {
    const bought = daysAgo(plan.owned_days);
    const bike = await this.prisma.bikes.create({
      data: {
        user_id: userId,
        bike_brand: plan.bike_brand,
        bike_model: plan.bike_model,
        bikename: plan.bikename,
        bike_type_id: catalogue.bikeTypeIds.get(plan.bike_type),
        year: plan.year,
        wheel_size: plan.wheel_size,
        bike_size: plan.bike_size,
        frame_material: plan.frame_material,
        ebike: plan.ebike,
        has_front_suspension: hasPart(plan, 'Fork'),
        has_rear_suspension: hasPart(plan, 'Shock'),
        total_km: plan.total_km,
        total_time_min: Math.round(plan.total_km * MIN_PER_KM),
        image_url: imageUrl,
        is_shared: plan.is_shared,
        created_at: bought,
        updated_at: bought,
      },
      select: { id: true },
    });

    await this.copyServiceIntervals(bike.id, plan);
    const partIds = await this.createParts(bike.id, plan, catalogue);
    await this.createServices(bike.id, plan, partIds, catalogue);
    await this.createSetups(bike.id, plan);
  }

  // The per-bike service plan the app materializes at creation (see bike.service.ts).
  private async copyServiceIntervals(bikeId: number, plan: BikePlan): Promise<void> {
    const eventFilter: Prisma.events_actionWhereInput = {};
    if (!hasPart(plan, 'Fork')) eventFilter.req_front_suspension = false;
    if (!hasPart(plan, 'Shock')) eventFilter.req_rear_suspension = false;

    const defaults = await this.prisma.default_service_intervals.findMany({
      where: { category: { has: plan.bike_type }, events_action: eventFilter },
    });

    await this.prisma.bike_service_interval.createMany({
      data: defaults.map((interval) => ({
        bike_id: bikeId,
        event_actions_id: interval.event_actions_id,
        service_interval_km: interval.service_interval_km,
        service_interval_min: interval.service_interval_min,
        health_index_interval: interval.health_index_interval,
      })),
    });
  }

  private async createParts(bikeId: number, plan: BikePlan, catalogue: Catalogue): Promise<Map<string, number>> {
    const partIds = new Map<string, number>();

    for (const planned of plan.parts) {
      const mounted = mountedAt(plan, planned.key);
      const created = await this.prisma.components_mounted.create({
        data: {
          bike_id: bikeId,
          component_type_id: catalogue.componentTypeIds.get(planned.component_type)!,
          component_desc: planned.component_desc,
          position: planned.position,
          mounted_at: mounted,
          // Last Updated reads this, so each garage shows its own date instead of today.
          updated_at: mounted,
          created_at: mounted,
          ...wearOf(planned.component_type, planned.km),
        },
        select: { id: true },
      });
      partIds.set(planned.key, created.id);
    }
    return partIds;
  }

  private async createServices(
    bikeId: number,
    plan: BikePlan,
    partIds: Map<string, number>,
    catalogue: Catalogue,
  ): Promise<void> {
    for (const service of plan.services) {
      const date = daysAgo(service.days_ago);
      const bikeKm = plan.total_km - service.km_ago;

      const event = await this.prisma.events_bikes.create({
        data: {
          bike_id: bikeId,
          note: service.note,
          total_cost: totalCost(service),
          service_date: date,
          created_at: date,
          updated_at: date,
          place: service.place,
          shop_name: service.shop_name,
        },
        select: { id: true },
      });

      for (const action of service.actions) {
        const actionDone = await this.prisma.event_actions_done.create({
          data: {
            bike_event_id: event.id,
            event_action_id: catalogue.actionIds.get(action.action_name)!,
            partial_cost: action.cost,
            part_replaced: action.replacement,
            created_at: date,
            bike_km_at_time: bikeKm,
            bike_minutes_at_time: Math.round(bikeKm * MIN_PER_KM),
          },
          select: { id: true },
        });

        await this.prisma.action_done_component_map.createMany({
          data: action.part_keys.map((key) => ({
            event_action_done_id: actionDone.id,
            component_mounted_id: partIds.get(key)!,
            ...baseline(plan.parts.find((planned) => planned.key === key)!, service, action.replacement),
          })),
        });
      }
    }
  }

  // The first profile is the one the bike is ridden at, as the app sets it.
  private async createSetups(bikeId: number, plan: BikePlan): Promise<void> {
    for (const [index, setup] of plan.setups.entries()) {
      const profile = await this.prisma.setup_profiles.create({
        data: {
          bike_id: bikeId,
          name: setup.name,
          front_tire_psi: setup.front_tire_psi,
          rear_tire_psi: setup.rear_tire_psi,
          fork_pressure_psi: setup.fork?.pressure_psi,
          fork_sag_percent: setup.fork?.sag_percent,
          fork_tokens: setup.fork?.tokens,
          fork_rebound_ls: setup.fork?.rebound,
          fork_compression_ls: setup.fork?.compression,
          shock_pressure_psi: setup.shock?.pressure_psi,
          shock_sag_percent: setup.shock?.sag_percent,
          shock_tokens: setup.shock?.tokens,
          shock_rebound_ls: setup.shock?.rebound,
          shock_compression_ls: setup.shock?.compression,
        },
        select: { id: true },
      });
      if (index === 0) {
        await this.prisma.bikes.update({ where: { id: bikeId }, data: { active_setup_profile_id: profile.id } });
      }
    }
  }

  // The row and the bell notice the real flow would have written; no push, there is no queue here.
  private async followMe(
    riderId: number,
    rider: RiderPlan,
    status: follow_status,
    me: Me,
    days: number,
  ): Promise<void> {
    const asked = daysAgo(days);
    await this.prisma.follows.create({
      data: {
        follower_id: riderId,
        followed_id: me.id,
        status,
        created_at: asked,
        accepted_at: status === 'ACCEPTED' ? asked : null,
      },
    });

    const type: FollowNotice = status === 'ACCEPTED' ? 'new_follower' : 'follow_request';
    const payload = { handle: rider.handle, personName: rider.name };
    await this.prisma.notifications.create({
      data: {
        user_id: me.id,
        type,
        ...buildNotificationText(type, me.language, payload),
        payload,
        dedup_key: noticeKey(type, riderId),
        created_at: asked,
      },
    });
  }
}
