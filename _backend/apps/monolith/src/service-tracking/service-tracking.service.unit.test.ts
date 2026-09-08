import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ServiceTrackingService } from './service-tracking.service';
import { PrismaService } from '../../prisma/prisma.service';

const OWNER_ID = 7;
const BIKE_ID = 21;
const CHAIN_TYPE_ID = 12;
const TYRE_TYPE_ID = 30;
const CHAIN_REPLACEMENT_ID = 4;

// One part on the bike, with the accumulators the rides have grown.
function mountedRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 55,
    bike_id: BIKE_ID,
    component_type_id: CHAIN_TYPE_ID,
    component_desc: 'Shimano XT M8100',
    position: null,
    removed_at: null,
    is_active: true,
    is_deleted: false,
    total_km: 0,
    total_time_min: 0,
    health_index: 0,
    component_types: { id: CHAIN_TYPE_ID, component_type: 'Chain', i18n_key: 'component.chain' },
    ...overrides,
  };
}

// One line of the bike's own service plan: the interval, and the kinds of part its action
// is done on.
function intervalRow(
  overrides: Record<string, unknown> = {},
  targets: number[] = [CHAIN_TYPE_ID],
): Record<string, unknown> {
  return {
    id: 1,
    bike_id: BIKE_ID,
    event_actions_id: CHAIN_REPLACEMENT_ID,
    service_interval_km: null,
    service_interval_min: null,
    health_index_interval: null,
    events_action: {
      id: CHAIN_REPLACEMENT_ID,
      action_name: 'Chain Replacement',
      i18n_key: 'action.chainReplacement',
      event_action_targets: targets.map((component_type_id) => ({ component_type_id })),
    },
    ...overrides,
  };
}

// A Wear Baseline: what the part's accumulators read when the work was recorded.
function baselineRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    component_mounted_id: 55,
    km_at_time: null,
    time_min_at_time: null,
    drivetrain_km_at_time: null,
    suspension_min_at_time: null,
    event_actions_done: {
      id: 900,
      event_action_id: CHAIN_REPLACEMENT_ID,
      events_bikes: { service_date: new Date('2025-01-01T00:00:00.000Z'), is_deleted: false },
    },
    ...overrides,
  };
}

describe('ServiceTrackingService', () => {
  let service: ServiceTrackingService;

  const mockPrismaService = {
    bikes: { findFirst: jest.fn() },
    bike_service_interval: { findMany: jest.fn() },
    components_mounted: { findMany: jest.fn() },
    action_done_component_map: { findMany: jest.fn() },
    service_snooze: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceTrackingService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<ServiceTrackingService>(ServiceTrackingService);

    // The caller's own bike, in use, unless a test says otherwise.
    mockPrismaService.bikes.findFirst.mockResolvedValue({ id: BIKE_ID, is_deleted: false });
    // Nothing has been serviced and nothing has been put off unless a test sets it up.
    mockPrismaService.action_done_component_map.findMany.mockResolvedValue([]);
    mockPrismaService.service_snooze.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // What the bike carries and what it plans, as the read finds them.
  function given(parts: Record<string, unknown>[], intervals: Record<string, unknown>[]): void {
    mockPrismaService.components_mounted.findMany.mockResolvedValue(parts);
    mockPrismaService.bike_service_interval.findMany.mockResolvedValue(intervals);
  }

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBikeTrackedActions', () => {
    it('measures from zero when the pair has never been serviced', async () => {
      given([mountedRow({ total_km: 2000 })], [intervalRow({ service_interval_km: 4000 })]);

      const tracked = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(tracked).toHaveLength(1);
      expect(tracked[0]).toMatchObject({
        component_mounted_id: 55,
        component_type: 'Chain',
        action_id: CHAIN_REPLACEMENT_ID,
        action_name: 'Chain Replacement',
        axis: 'km',
        current_value: 2000,
        interval_value: 4000,
        percentage: 50,
        attention_level: 'good',
      });
    });

    // A second-hand part is entered with the kilometres it already carries, and those count.
    it('counts the mileage a used part was entered with', async () => {
      given([mountedRow({ total_km: 3600 })], [intervalRow({ service_interval_km: 4000 })]);

      const [tracked] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(tracked.current_value).toBe(3600);
      expect(tracked.percentage).toBe(90);
    });

    it('measures from the Wear Baseline once the pair has been serviced', async () => {
      given([mountedRow({ total_km: 5000 })], [intervalRow({ service_interval_km: 4000 })]);
      mockPrismaService.action_done_component_map.findMany.mockResolvedValue([baselineRow({ km_at_time: 4000 })]);

      const [tracked] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(tracked.current_value).toBe(1000);
      expect(tracked.percentage).toBe(25);
    });

    // The latest occasion is the one that counts, whatever order the rows arrive in.
    it('measures from the most recent Wear Baseline', async () => {
      given([mountedRow({ total_km: 5000 })], [intervalRow({ service_interval_km: 4000 })]);
      mockPrismaService.action_done_component_map.findMany.mockResolvedValue([
        baselineRow({
          km_at_time: 1000,
          event_actions_done: {
            id: 800,
            event_action_id: CHAIN_REPLACEMENT_ID,
            events_bikes: { service_date: new Date('2024-01-01T00:00:00.000Z'), is_deleted: false },
          },
        }),
        baselineRow({ km_at_time: 4000 }),
      ]);

      const [tracked] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(tracked.current_value).toBe(1000);
    });

    // A Service that was deleted is no longer part of the record, so it freezes nothing.
    it('ignores the Wear Baseline of a deleted Service', async () => {
      given([mountedRow({ total_km: 5000 })], [intervalRow({ service_interval_km: 4000 })]);
      mockPrismaService.action_done_component_map.findMany.mockResolvedValue([
        baselineRow({
          km_at_time: 4000,
          event_actions_done: {
            id: 900,
            event_action_id: CHAIN_REPLACEMENT_ID,
            events_bikes: { service_date: new Date('2025-01-01T00:00:00.000Z'), is_deleted: true },
          },
        }),
      ]);

      const [tracked] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(tracked.current_value).toBe(5000);
    });

    // Work recorded against another action on the same part does not reset this one.
    it('ignores a Wear Baseline frozen for another action', async () => {
      given([mountedRow({ total_km: 2000 })], [intervalRow({ service_interval_km: 4000 })]);
      mockPrismaService.action_done_component_map.findMany.mockResolvedValue([
        baselineRow({
          km_at_time: 1500,
          event_actions_done: {
            id: 901,
            event_action_id: 99,
            events_bikes: { service_date: new Date('2025-01-01T00:00:00.000Z'), is_deleted: false },
          },
        }),
      ]);

      const [tracked] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(tracked.current_value).toBe(2000);
    });

    it('reads an interval in minutes against the part ride time', async () => {
      given([mountedRow({ total_time_min: 3000 })], [intervalRow({ service_interval_min: 6000 })]);

      const [tracked] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(tracked).toMatchObject({ axis: 'min', current_value: 3000, interval_value: 6000, percentage: 50 });
    });

    it('reads an interval in health index against the part wear index', async () => {
      given([mountedRow({ health_index: 90 })], [intervalRow({ health_index_interval: 100 })]);

      const [tracked] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(tracked).toMatchObject({
        axis: 'health_index',
        current_value: 90,
        interval_value: 100,
        percentage: 90,
        attention_level: 'warning',
      });
    });

    // Nothing freezes a wear index, so recorded work does not reset this axis — replacing
    // the part is what does, by starting a new part at zero.
    it('goes on measuring a wear index through a recorded Service', async () => {
      given([mountedRow({ health_index: 90 })], [intervalRow({ health_index_interval: 100 })]);
      mockPrismaService.action_done_component_map.findMany.mockResolvedValue([baselineRow({ km_at_time: 4000 })]);

      const [tracked] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(tracked.current_value).toBe(90);
    });

    it('takes the highest percentage when the interval fills in more than one axis', async () => {
      given(
        [mountedRow({ total_km: 1000, total_time_min: 5400 })],
        [intervalRow({ service_interval_km: 4000, service_interval_min: 6000 })],
      );

      const [tracked] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(tracked).toMatchObject({ axis: 'min', current_value: 5400, interval_value: 6000, percentage: 90 });
    });

    // Nothing is capped: an overdue part says how far past due it is.
    it('reports a percentage above 100 as it reads', async () => {
      given([mountedRow({ total_km: 5280 })], [intervalRow({ service_interval_km: 4000 })]);

      const [tracked] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(tracked.percentage).toBe(132);
      expect(tracked.attention_level).toBe('overdue');
    });

    // The Extension lengthens the interval; the wear already done is untouched, and a part
    // that was overdue reads under the interval it was given.
    it('adds an Extension to the interval rather than to the wear', async () => {
      given([mountedRow({ total_km: 4000 })], [intervalRow({ service_interval_km: 4000 })]);
      mockPrismaService.service_snooze.findMany.mockResolvedValue([
        {
          component_mounted_id: 55,
          event_actions_id: CHAIN_REPLACEMENT_ID,
          extended_by_km: 400,
          extended_by_min: 0,
          extended_by_healthIndex: 0,
        },
      ]);

      const [tracked] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(tracked).toMatchObject({ current_value: 4000, interval_value: 4400, attention_level: 'warning' });
    });

    // The bands sit on the same numbers Service Tracking announces at.
    describe.each([
      [3160, 'good'],
      [3200, 'warning'],
      [3760, 'warning'],
      [3800, 'critical'],
      [3960, 'critical'],
      [4000, 'overdue'],
    ])('at %i km of a 4 000 km interval', (kilometres, level) => {
      it(`reads ${level}`, async () => {
        given([mountedRow({ total_km: kilometres })], [intervalRow({ service_interval_km: 4000 })]);

        const [tracked] = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

        expect(tracked.attention_level).toBe(level);
      });
    });

    it('leaves out an action the bike keeps no interval for', async () => {
      given([mountedRow()], []);

      await expect(service.getBikeTrackedActions(BIKE_ID, OWNER_ID)).resolves.toEqual([]);
    });

    it('leaves out a part no interval action is done on', async () => {
      given([mountedRow({ component_type_id: TYRE_TYPE_ID })], [intervalRow({ service_interval_km: 4000 })]);

      await expect(service.getBikeTrackedActions(BIKE_ID, OWNER_ID)).resolves.toEqual([]);
    });

    it('tracks nothing on an archived bike', async () => {
      mockPrismaService.bikes.findFirst.mockResolvedValue({ id: BIKE_ID, is_deleted: true });
      given([mountedRow({ total_km: 5000 })], [intervalRow({ service_interval_km: 4000 })]);

      await expect(service.getBikeTrackedActions(BIKE_ID, OWNER_ID)).resolves.toEqual([]);
    });

    it('refuses a bike that is not the caller own', async () => {
      mockPrismaService.bikes.findFirst.mockResolvedValue(null);

      await expect(service.getBikeTrackedActions(BIKE_ID, OWNER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('leaves out a dismounted part', async () => {
      given(
        [mountedRow({ total_km: 5000, is_active: false, removed_at: new Date('2025-06-01T00:00:00.000Z') })],
        [intervalRow({ service_interval_km: 4000 })],
      );

      await expect(service.getBikeTrackedActions(BIKE_ID, OWNER_ID)).resolves.toEqual([]);
    });

    it('leaves out a deleted part', async () => {
      given([mountedRow({ total_km: 5000, is_deleted: true })], [intervalRow({ service_interval_km: 4000 })]);

      await expect(service.getBikeTrackedActions(BIKE_ID, OWNER_ID)).resolves.toEqual([]);
    });

    // Two tyres are two Tracked Actions: a fresh rear one does not hide a worn front one.
    it('tracks two parts of the same kind separately, worst first', async () => {
      given(
        [
          mountedRow({ id: 61, component_type_id: TYRE_TYPE_ID, position: 'front', total_km: 1000 }),
          mountedRow({ id: 62, component_type_id: TYRE_TYPE_ID, position: 'rear', total_km: 3000 }),
        ],
        [intervalRow({ id: 2, event_actions_id: 8, service_interval_km: 4000 }, [TYRE_TYPE_ID])],
      );
      mockPrismaService.action_done_component_map.findMany.mockResolvedValue([]);

      const tracked = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(tracked).toHaveLength(2);
      expect(tracked.map((action) => action.component_mounted_id)).toEqual([62, 61]);
      expect(tracked.map((action) => action.percentage)).toEqual([75, 25]);
    });

    // An Extension is granted on one part, so the other one goes on reading as it did.
    it('leaves the other part of the same kind untouched by an Extension', async () => {
      given(
        [
          mountedRow({ id: 61, component_type_id: TYRE_TYPE_ID, position: 'front', total_km: 4000 }),
          mountedRow({ id: 62, component_type_id: TYRE_TYPE_ID, position: 'rear', total_km: 4000 }),
        ],
        [intervalRow({ id: 2, event_actions_id: 8, service_interval_km: 4000 }, [TYRE_TYPE_ID])],
      );
      mockPrismaService.service_snooze.findMany.mockResolvedValue([
        {
          component_mounted_id: 61,
          event_actions_id: 8,
          extended_by_km: 400,
          extended_by_min: 0,
          extended_by_healthIndex: 0,
        },
      ]);

      const tracked = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(tracked.map((action) => action.attention_level)).toEqual(['overdue', 'warning']);
    });

    // One part answers to every action the bike plans for its kind.
    it('tracks one part under each action that targets it', async () => {
      given(
        [mountedRow({ total_km: 2000 })],
        [
          intervalRow({ service_interval_km: 4000 }),
          intervalRow({ id: 2, event_actions_id: 9, service_interval_km: 1000 }),
        ],
      );

      const tracked = await service.getBikeTrackedActions(BIKE_ID, OWNER_ID);

      expect(tracked.map((action) => action.action_id)).toEqual([9, CHAIN_REPLACEMENT_ID]);
      expect(tracked.map((action) => action.percentage)).toEqual([200, 50]);
    });
  });
});
