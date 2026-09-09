import type { ToolCallOptions } from 'ai';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { Response_GarageTrackedActionDto } from '../../service-tracking/dto/response-garage-tracked-action';
import type { ServiceTrackingService } from '../../service-tracking/service-tracking.service';
import { trackedActionTools, type TrackedActionRow, type TrackedActionsToolSet } from './tracked-actions.tools';

const OWNER_ID = 7;
const STRANGER_ID = 8;

const BIKE_ID = 21;
const SECOND_BIKE_ID = 22;

const CHAIN_ID = 55;
const FORK_ID = 56;

const CHAIN_REPLACEMENT = 42;
const FORK_SERVICE = 43;

// The page the tool cuts at, and enough readings to cut it once.
const PAGE_SIZE = 50;
const TOO_MANY = 70;

// What the model would send with a call. The tool reads only its input.
const CALL: ToolCallOptions = { toolCallId: 'test-call', messages: [] };

// One reading as the garage path hands it over, the i18n keys and the year included - so a test
// can watch them stay out of the row.
function action(overrides: Partial<Response_GarageTrackedActionDto> = {}): Response_GarageTrackedActionDto {
  return {
    bike_id: BIKE_ID,
    bike_brand: 'Santa Cruz',
    bike_model: 'Hightower',
    year: 2022,
    component_mounted_id: CHAIN_ID,
    component_type_id: 12,
    component_type: 'Chain',
    component_type_i18n_key: 'component.chain',
    component_desc: 'Shimano XT M8100',
    position: null,
    event_action_id: CHAIN_REPLACEMENT,
    action_name: 'Chain Replacement',
    action_i18n_key: 'action.chainReplacement',
    axis: 'km',
    measure: 'drivetrain_km',
    current: 3600,
    interval: 4000,
    percentage: 90,
    level: 'warning',
    extended: false,
    ...overrides,
  };
}

// The grouped query the tool asks `unfed` with.
interface RidesWhere {
  user_id?: number;
  bike_id?: { in: number[] };
}

describe('trackedActionTools', () => {
  const mockTracking = { getGarageTrackedActions: jest.fn() };

  const mockPrisma = {
    rides: { groupBy: jest.fn() },
  };

  // The readings this owner has, answered through the same cutoff the real service applies - so a
  // test reads what execute() answered rather than what it asked for.
  function readings(actions: Response_GarageTrackedActionDto[], owner: number = OWNER_ID): void {
    mockTracking.getGarageTrackedActions.mockImplementation((userId: number, minPercentage: number) =>
      Promise.resolve(userId === owner ? actions.filter((row) => row.percentage >= minPercentage) : []),
    );
  }

  // Which bikes have a ride on record, answered through the tool's own where.
  function ridden(bikeIds: number[], owner: number = OWNER_ID): void {
    mockPrisma.rides.groupBy.mockImplementation(({ where }: { where: RidesWhere }) =>
      Promise.resolve(
        bikeIds
          .filter((id) => where.user_id === owner && (where.bike_id?.in ?? []).includes(id))
          .map((bike_id) => ({ bike_id, _count: { _all: 1 } })),
      ),
    );
  }

  function tools(userId: number): TrackedActionsToolSet {
    return trackedActionTools(
      mockTracking as unknown as ServiceTrackingService,
      mockPrisma as unknown as PrismaService,
      userId,
    );
  }

  function pairs(rows: TrackedActionRow[]): string[] {
    return rows.map((row) => `${row.component_mounted_id}:${row.event_action_id}`);
  }

  beforeEach(() => {
    readings([action()]);
    ridden([BIKE_ID, SECOND_BIKE_ID]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('hands the reading over finished, with what is left of the interval worked out here', async () => {
    const page = await tools(OWNER_ID).list_tracked_actions.execute({}, CALL);

    expect(page.total_count).toBe(1);
    expect(page.truncated).toBeUndefined();
    expect(page.next_cursor).toBeUndefined();
    expect(page.rows[0]).toEqual({
      bike_id: BIKE_ID,
      bike_brand: 'Santa Cruz',
      bike_model: 'Hightower',
      component_mounted_id: CHAIN_ID,
      component_type_id: 12,
      component_type: 'Chain',
      component_desc: 'Shimano XT M8100',
      position: '',
      event_action_id: CHAIN_REPLACEMENT,
      action_name: 'Chain Replacement',
      axis: 'km',
      measure: 'drivetrain_km',
      current: 3600,
      interval: 4000,
      remaining: 400,
      percentage: 90,
      level: 'warning',
      extended: false,
      unfed: false,
    });
  });

  it('reads a reading past its interval as a negative remaining, and never caps the percentage', async () => {
    readings([action({ current: 5300, interval: 4000, percentage: 132, level: 'overdue' })]);

    const page = await tools(OWNER_ID).list_tracked_actions.execute({}, CALL);

    expect(page.rows[0].remaining).toBe(-1300);
    expect(page.rows[0].percentage).toBe(132);
    expect(page.rows[0].level).toBe('overdue');
  });

  it('drops the year and the i18n keys, so a bike is named the one way every other tool names it', async () => {
    const answered = JSON.stringify(await tools(OWNER_ID).list_tracked_actions.execute({}, CALL));

    expect(answered).not.toContain('year');
    expect(answered).not.toContain('2022');
    expect(answered).not.toContain('i18n_key');
    expect(answered).not.toContain('component.chain');
  });

  it('says a bike with no ride is unfed, so nothing on it reads as being in order', async () => {
    readings([
      action({ current: 0, percentage: 0, level: 'good' }),
      action({ bike_id: SECOND_BIKE_ID, component_mounted_id: FORK_ID, current: 0, percentage: 0, level: 'good' }),
    ]);
    ridden([SECOND_BIKE_ID]);

    const page = await tools(OWNER_ID).list_tracked_actions.execute({}, CALL);

    expect(page.rows.map((row) => row.unfed)).toEqual([true, false]);
  });

  it('asks about the bikes it read and nobody else, in one grouped query', async () => {
    readings([action(), action({ bike_id: SECOND_BIKE_ID, component_mounted_id: FORK_ID })]);

    await tools(OWNER_ID).list_tracked_actions.execute({}, CALL);

    expect(mockPrisma.rides.groupBy).toHaveBeenCalledTimes(1);
    expect(mockPrisma.rides.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['bike_id'],
        where: expect.objectContaining({ user_id: OWNER_ID, bike_id: { in: [BIKE_ID, SECOND_BIKE_ID] } }),
      }),
    );
  });

  it('reads worst first, and tells two readings sharing a percentage apart by their pair', async () => {
    readings([
      action({ component_mounted_id: FORK_ID, event_action_id: FORK_SERVICE, percentage: 0, level: 'good' }),
      action({ component_mounted_id: CHAIN_ID, event_action_id: FORK_SERVICE, percentage: 0, level: 'good' }),
      action({ component_mounted_id: CHAIN_ID, event_action_id: CHAIN_REPLACEMENT, percentage: 0, level: 'good' }),
      action({ component_mounted_id: FORK_ID, event_action_id: FORK_SERVICE, percentage: 120, level: 'overdue' }),
    ]);

    const page = await tools(OWNER_ID).list_tracked_actions.execute({}, CALL);

    expect(pairs(page.rows)).toEqual([
      `${FORK_ID}:${FORK_SERVICE}`,
      `${CHAIN_ID}:${CHAIN_REPLACEMENT}`,
      `${CHAIN_ID}:${FORK_SERVICE}`,
      `${FORK_ID}:${FORK_SERVICE}`,
    ]);
    expect(page.rows.map((row) => row.percentage)).toEqual([120, 0, 0, 0]);
  });

  it('passes the cutoff to the service rather than filtering the readings itself', async () => {
    readings([action({ percentage: 90 }), action({ component_mounted_id: FORK_ID, percentage: 40, level: 'good' })]);

    const page = await tools(OWNER_ID).list_tracked_actions.execute({ min_percentage: 80 }, CALL);

    expect(mockTracking.getGarageTrackedActions).toHaveBeenCalledWith(OWNER_ID, 80);
    expect(page.total_count).toBe(1);
    expect(page.rows.map((row) => row.percentage)).toEqual([90]);
  });

  it('reads a cutoff below zero as no cutoff at all', async () => {
    await tools(OWNER_ID).list_tracked_actions.execute({ min_percentage: -5 }, CALL);

    expect(mockTracking.getGarageTrackedActions).toHaveBeenCalledWith(OWNER_ID, 0);
  });

  it('keeps only the bike asked for', async () => {
    readings([action(), action({ bike_id: SECOND_BIKE_ID, component_mounted_id: FORK_ID })]);

    const page = await tools(OWNER_ID).list_tracked_actions.execute({ bike_id: SECOND_BIKE_ID }, CALL);

    expect(page.total_count).toBe(1);
    expect(page.rows.map((row) => row.bike_id)).toEqual([SECOND_BIKE_ID]);
  });

  it("reads nothing of a garage that is not the caller's", async () => {
    const page = await tools(STRANGER_ID).list_tracked_actions.execute({}, CALL);

    expect(page.total_count).toBe(0);
    expect(page.rows).toEqual([]);
    expect(mockTracking.getGarageTrackedActions).toHaveBeenCalledWith(STRANGER_ID, 0);
  });

  it('cuts a long list into pages and carries on where the cursor left off', async () => {
    readings(
      Array.from({ length: TOO_MANY }, (_, index) =>
        action({ component_mounted_id: CHAIN_ID + index, percentage: TOO_MANY - index }),
      ),
    );

    const first = await tools(OWNER_ID).list_tracked_actions.execute({}, CALL);

    expect(first.total_count).toBe(TOO_MANY);
    expect(first.rows).toHaveLength(PAGE_SIZE);
    expect(first.truncated).toBe(true);
    expect(first.next_cursor).toEqual(expect.any(String));

    const second = await tools(OWNER_ID).list_tracked_actions.execute({ cursor: first.next_cursor }, CALL);

    expect(second.total_count).toBe(TOO_MANY);
    expect(second.rows).toHaveLength(TOO_MANY - PAGE_SIZE);
    expect(second.truncated).toBeUndefined();
    expect(second.next_cursor).toBeUndefined();

    // Every reading read exactly once, worst first across both pages.
    const percentages = [...first.rows, ...second.rows].map((row) => row.percentage);
    expect(percentages).toEqual(Array.from({ length: TOO_MANY }, (_, index) => TOO_MANY - index));
  });

  it('reads a nonsense cursor as no cursor, which is a first page', async () => {
    readings(
      Array.from({ length: TOO_MANY }, (_, index) =>
        action({ component_mounted_id: CHAIN_ID + index, percentage: TOO_MANY - index }),
      ),
    );

    const page = await tools(OWNER_ID).list_tracked_actions.execute({ cursor: 'not-a-cursor' }, CALL);

    expect(page.rows).toHaveLength(PAGE_SIZE);
    expect(page.rows[0].percentage).toBe(TOO_MANY);
    expect(page.truncated).toBe(true);
  });
});
