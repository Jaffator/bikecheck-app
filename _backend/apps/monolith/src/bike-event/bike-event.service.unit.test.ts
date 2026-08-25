import { Test, TestingModule } from '@nestjs/testing';
import { BikeEventService } from './bike-event.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { Create_BikeEventDto } from './dto/create-bike-event.dto';
import { Update_BikeEventDto } from './dto/update-bike-event.dto';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// The service freezes wear baselines against ride data, so every test here fixes
// both dates: when the work happened and how much was ridden after it.
const SERVICE_DATE = new Date('2026-07-01T00:00:00.000Z');
// Rides on the day of the work count as ridden by it, so the wear window opens at its end.
const WINDOW_START = new Date('2026-07-01T23:59:59.999Z');
const OWNER_ID = 7;
const BIKE_ID = 15;

describe('BikeEventService', () => {
  let service: BikeEventService;

  const mockTx = {
    events_bikes: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    event_actions_done: { create: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
    action_done_component_map: { create: jest.fn(), createMany: jest.fn(), update: jest.fn() },
    components_mounted: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    bike_event_attachments: { createMany: jest.fn(), deleteMany: jest.fn() },
    component_types: { findUnique: jest.fn() },
    rides: { aggregate: jest.fn() },
    bikes: { findFirst: jest.fn(), findFirstOrThrow: jest.fn() },
  };

  const mockStorage = {
    uploadImageR2CloudFare: jest.fn(),
    uploadPdfR2CloudFare: jest.fn(),
  };

  const mockPrisma = {
    bikes: { findFirst: jest.fn() },
    events_bikes: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    component_groups: { findUnique: jest.fn() },
    events_action: { findMany: jest.fn() },
    components_mounted: { findMany: jest.fn() },
    rides: { aggregate: jest.fn() },
    $transaction: jest.fn(),
  };

  type RideSum = { distance_m?: number; duration_min?: number; drivetrain_meters?: number; suspension_min?: number };

  const aggregateResult = (sum: RideSum): { _sum: Record<string, number | null> } => ({
    _sum: {
      distance_m: sum.distance_m ?? null,
      duration_min: sum.duration_min ?? null,
      drivetrain_meters: sum.drivetrain_meters ?? null,
      suspension_min: sum.suspension_min ?? null,
    },
  });

  // The service asks rides two questions - what was ridden after the window opened, and
  // what the bike had ridden up to it - so the mock answers by which one it was asked.
  const rides = (after: RideSum, upTo: RideSum = {}): void => {
    const answer = (args: {
      where: { started_at?: { gt?: Date; lte?: Date } };
    }): { _sum: Record<string, number | null> } =>
      args.where.started_at?.gt !== undefined ? aggregateResult(after) : aggregateResult(upTo);
    mockTx.rides.aggregate.mockImplementation(answer);
  };

  // Rides ridden after the service date, in the shape prisma's aggregate returns.
  const ridesAfter = aggregateResult;

  const dto = (overrides: Partial<Create_BikeEventDto> = {}): Create_BikeEventDto =>
    ({
      bike_id: BIKE_ID,
      total_cost: 100,
      note: 'Service',
      service_date: SERVICE_DATE.toISOString(),
      actions_done: [],
      ...overrides,
    }) as Create_BikeEventDto;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BikeEventService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<BikeEventService>(BikeEventService);

    // Caller owns the bike unless a test says otherwise.
    mockPrisma.bikes.findFirst.mockResolvedValue({
      id: BIKE_ID,
      user_id: OWNER_ID,
      total_km: 5000,
      total_time_min: 12000,
      has_front_suspension: true,
      has_rear_suspension: true,
    });
    mockTx.bikes.findFirst.mockResolvedValue({ id: BIKE_ID, user_id: OWNER_ID, total_km: 5000, total_time_min: 12000 });
    mockTx.bikes.findFirstOrThrow.mockResolvedValue({
      id: BIKE_ID,
      total_km: 5000,
      total_time_min: 12000,
      has_front_suspension: true,
      has_rear_suspension: true,
    });
    mockTx.events_bikes.create.mockResolvedValue({ id: 99 });
    // Every component a test names is on the caller's bike unless the test says otherwise.
    mockTx.components_mounted.count.mockImplementation((args: { where: { id: { in: number[] } } }) =>
      Promise.resolve(args.where.id.in.length),
    );
    mockTx.event_actions_done.create.mockResolvedValue({ id: 500 });
    rides({});
    mockPrisma.rides.aggregate.mockResolvedValue(ridesAfter({}));
    mockPrisma.events_bikes.findFirst.mockResolvedValue({ id: 99 });
    mockPrisma.events_bikes.findUnique.mockResolvedValue({
      id: 99,
      bike_id: BIKE_ID,
      note: 'Service',
      total_cost: 100,
      service_date: SERVICE_DATE,
      created_at: SERVICE_DATE,
      updated_at: null,
      event_actions_done: [],
      bike_event_attachments: [],
      bikes: { user_id: OWNER_ID },
    });
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));
  });

  it('rewinds a baseline by the rides ridden after the service date', async () => {
    // ARRANGE: component sits at 1000 km today, 200 km of which came after the work.
    mockTx.components_mounted.findMany.mockResolvedValue([
      { id: 45, total_km: 1000, total_time_min: 3000, drivetrain_km: 900, suspension_min: 2000 },
    ]);
    rides({ distance_m: 200_000, duration_min: 600, drivetrain_meters: 150_000, suspension_min: 400 });

    // ACT
    await service.create(
      dto({
        actions_done: [{ action_id: 1, part_replaced: false, mounted_components_involved: [45] }],
      } as Partial<Create_BikeEventDto>),
      OWNER_ID,
    );

    // ASSERT: only the rides taken after the work count, deleted ones excluded.
    expect(mockTx.rides.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bike_id: BIKE_ID, is_deleted: { not: true }, started_at: { gt: WINDOW_START } },
      }),
    );

    // The baseline is the bike as it stood on the service date, not today.
    expect(mockTx.action_done_component_map.createMany).toHaveBeenCalledWith({
      data: [
        {
          event_action_done_id: 500,
          component_mounted_id: 45,
          km_at_time: 800,
          time_min_at_time: 2400,
          drivetrain_km_at_time: 750,
          suspension_min_at_time: 1600,
        },
      ],
    });
  });

  it('begins the replacement component at the service date, carrying the wear ridden since', async () => {
    // ARRANGE: fork fitted a month ago, 200 km ridden on it since.
    mockTx.components_mounted.findMany.mockResolvedValue([]);
    mockTx.components_mounted.create.mockResolvedValue({ id: 46 });
    mockTx.component_types.findUnique.mockResolvedValue({ component_type: 'Fork' });
    rides({ distance_m: 200_000, duration_min: 600, drivetrain_meters: 150_000, suspension_min: 400 });

    // ACT
    await service.create(
      dto({
        actions_replaced: [
          {
            old_component_mounted_id: 45,
            component_type_id: 21,
            new_component_desc: 'Fox 36 Factory',
            action_id: 2,
          },
        ],
      }),
      OWNER_ID,
    );

    // ASSERT: the old part stops being worn on the day it came off ...
    expect(mockTx.components_mounted.update).toHaveBeenCalledWith({
      where: { id: 45 },
      data: { is_active: false, removed_at: SERVICE_DATE },
    });

    // ... and the new one starts carrying what it genuinely rode since being fitted.
    expect(mockTx.components_mounted.create).toHaveBeenCalledWith({
      data: {
        bike_id: BIKE_ID,
        component_type_id: 21,
        component_desc: 'Fox 36 Factory',
        is_active: true,
        mounted_at: SERVICE_DATE,
        total_km: 200,
        total_time_min: 600,
        drivetrain_km: 150,
        suspension_min: 400,
      },
    });

    // Its baseline is zero: on the day it was fitted it had been ridden nowhere.
    expect(mockTx.action_done_component_map.create).toHaveBeenCalledWith({
      data: {
        event_action_done_id: 500,
        component_mounted_id: 46,
        km_at_time: 0,
        time_min_at_time: 0,
        drivetrain_km_at_time: 0,
        suspension_min_at_time: 0,
      },
    });
  });

  it("freezes today's accumulators when the work happened today", async () => {
    // ARRANGE: nothing was ridden after a service entered as it happened.
    mockTx.components_mounted.findMany.mockResolvedValue([
      { id: 45, total_km: 1000, total_time_min: 3000, drivetrain_km: 900, suspension_min: 2000 },
    ]);
    rides({});

    // ACT
    await service.create(
      dto({
        service_date: undefined,
        actions_done: [{ action_id: 1, part_replaced: false, mounted_components_involved: [45] }],
      }),
      OWNER_ID,
    );

    // ASSERT: the ordinary path is untouched by the rewind.
    expect(mockTx.action_done_component_map.createMany).toHaveBeenCalledWith({
      data: [
        {
          event_action_done_id: 500,
          component_mounted_id: 45,
          km_at_time: 1000,
          time_min_at_time: 3000,
          drivetrain_km_at_time: 900,
          suspension_min_at_time: 2000,
        },
      ],
    });
  });

  it('clamps a baseline at zero for a component mounted after the service date', async () => {
    // ARRANGE: the bike rode 200 km since the work, but this part only saw 50 of them.
    mockTx.components_mounted.findMany.mockResolvedValue([
      { id: 47, total_km: 50, total_time_min: 100, drivetrain_km: 40, suspension_min: 30 },
    ]);
    rides({ distance_m: 200_000, duration_min: 600, drivetrain_meters: 150_000, suspension_min: 400 });

    // ACT
    await service.create(
      dto({ actions_done: [{ action_id: 1, part_replaced: false, mounted_components_involved: [47] }] }),
      OWNER_ID,
    );

    // ASSERT: no negative wear.
    expect(mockTx.action_done_component_map.createMany).toHaveBeenCalledWith({
      data: [
        {
          event_action_done_id: 500,
          component_mounted_id: 47,
          km_at_time: 0,
          time_min_at_time: 0,
          drivetrain_km_at_time: 0,
          suspension_min_at_time: 0,
        },
      ],
    });
  });

  it('records the bike odometer as it stood on the service date', async () => {
    // ARRANGE: 5000 km of stated mileage, 300 km ridden up to the work, 200 km after it.
    mockTx.components_mounted.findMany.mockResolvedValue([]);
    rides({ distance_m: 200_000, duration_min: 600 }, { distance_m: 300_000, duration_min: 900 });

    // ACT
    await service.create(
      dto({ actions_done: [{ action_id: 1, part_replaced: false, mounted_components_involved: [] }] }),
      OWNER_ID,
    );

    // ASSERT: 5000 km of stated mileage plus the 300 km ridden up to that date.
    expect(mockTx.event_actions_done.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bike_km_at_time: 5300, bike_minutes_at_time: 12900 }),
      }),
    );
  });

  describe('ownership', () => {
    const STRANGER_ID = 99;

    beforeEach(() => {
      // The bike is not the caller's, so no row comes back for either lookup.
      mockPrisma.bikes.findFirst.mockResolvedValue(null);
      mockPrisma.events_bikes.findFirst.mockResolvedValue(null);
    });

    it("refuses to create a service on someone else's bike", async () => {
      await expect(service.create(dto(), STRANGER_ID)).rejects.toThrow(ForbiddenException);
    });

    it("refuses to list the services of someone else's bike", async () => {
      await expect(service.findAllBikeEvents(BIKE_ID, STRANGER_ID)).rejects.toThrow(ForbiddenException);
    });

    it("refuses to read someone else's service", async () => {
      await expect(service.findById(99, STRANGER_ID)).rejects.toThrow(ForbiddenException);
    });

    it("refuses to soft delete someone else's service", async () => {
      await expect(service.softDelete(99, STRANGER_ID)).rejects.toThrow(ForbiddenException);
    });

    it("refuses to hard delete someone else's service", async () => {
      await expect(service.hardDelete(99, STRANGER_ID)).rejects.toThrow(ForbiddenException);
    });

    it("refuses to edit someone else's service", async () => {
      await expect(service.update(99, { note: 'Not mine' }, STRANGER_ID)).rejects.toThrow(ForbiddenException);
    });

    it("refuses to list the actions available on someone else's bike", async () => {
      await expect(service.actionsGroupComponents(1, BIKE_ID, STRANGER_ID)).rejects.toThrow(ForbiddenException);
    });

    it("refuses to freeze a component that is not on the service's bike", async () => {
      // ARRANGE: the caller owns the bike, but names a part that is not on it.
      mockPrisma.bikes.findFirst.mockResolvedValue({
        id: BIKE_ID,
        user_id: OWNER_ID,
        total_km: 5000,
        total_time_min: 12000,
        has_front_suspension: true,
        has_rear_suspension: true,
      });
      mockTx.components_mounted.count.mockResolvedValue(0);

      // ACT + ASSERT
      await expect(
        service.create(
          dto({
            actions_done: [{ action_id: 1, part_replaced: false, mounted_components_involved: [45] }],
          } as Partial<Create_BikeEventDto>),
          OWNER_ID,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockTx.action_done_component_map.createMany).not.toHaveBeenCalled();
    });

    it("refuses to replace a component that is not on the service's bike", async () => {
      // ARRANGE
      mockPrisma.bikes.findFirst.mockResolvedValue({
        id: BIKE_ID,
        user_id: OWNER_ID,
        total_km: 5000,
        total_time_min: 12000,
        has_front_suspension: true,
        has_rear_suspension: true,
      });
      mockTx.components_mounted.count.mockResolvedValue(0);

      // ACT + ASSERT: the part is never deactivated, which is what the check is there for.
      await expect(
        service.create(
          dto({
            actions_replaced: [
              {
                old_component_mounted_id: 45,
                component_type_id: 16,
                new_component_desc: 'Shimano XT',
                action_id: 2,
              },
            ],
          } as Partial<Create_BikeEventDto>),
          OWNER_ID,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockTx.components_mounted.update).not.toHaveBeenCalled();
    });

    it("refuses to list the categories on someone else's bike", async () => {
      await expect(service.categoriesOnBike(BIKE_ID, STRANGER_ID)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('categories on a bike', () => {
    const DRIVETRAIN = {
      id: 1,
      group_name: 'Drivetrain',
      i18n_key: 'componentGroup.drivetrain',
      side_choice: false,
    };
    const BRAKES = { id: 2, group_name: 'Brakes', i18n_key: 'componentGroup.brakes', side_choice: true };

    // One mounted part, in the shape the query selects it: only the category it belongs to.
    const partIn = (group: typeof DRIVETRAIN): { component_types: { component_groups: typeof DRIVETRAIN } } => ({
      component_types: { component_groups: group },
    });

    it('counts the parts in each category the bike actually has', async () => {
      // ARRANGE: two drivetrain parts and one brake, nothing suspended.
      mockPrisma.components_mounted.findMany.mockResolvedValue([
        partIn(DRIVETRAIN),
        partIn(BRAKES),
        partIn(DRIVETRAIN),
      ]);

      // ACT
      const categories = await service.categoriesOnBike(BIKE_ID, OWNER_ID);

      // ASSERT: a category the bike has no parts in never appears, so it cannot be counted.
      expect(categories).toEqual([
        {
          group_id: 1,
          group_name: 'Drivetrain',
          group_i18n_key: 'componentGroup.drivetrain',
          side_choice: false,
          component_count: 2,
        },
        {
          group_id: 2,
          group_name: 'Brakes',
          group_i18n_key: 'componentGroup.brakes',
          side_choice: true,
          component_count: 1,
        },
      ]);
    });

    it('asks only for the parts still on the bike', async () => {
      // ARRANGE
      mockPrisma.components_mounted.findMany.mockResolvedValue([]);

      // ACT
      await service.categoriesOnBike(BIKE_ID, OWNER_ID);

      // ASSERT: a part taken off, or deleted, is not something the bike can be serviced on.
      expect(mockPrisma.components_mounted.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { bike_id: BIKE_ID, is_active: true, is_deleted: { not: true } },
        }),
      );
    });
  });

  describe('actions offered on a bike', () => {
    const bikeWithSuspension = (front: boolean, rear: boolean): void => {
      mockPrisma.bikes.findFirst.mockResolvedValue({
        id: BIKE_ID,
        user_id: OWNER_ID,
        total_km: 5000,
        total_time_min: 12000,
        has_front_suspension: front,
        has_rear_suspension: rear,
      });
    };

    // The where clause the catalogue was narrowed by, which is the whole point of the ticket.
    const askedWhere = (): Record<string, unknown> =>
      (mockPrisma.events_action.findMany.mock.calls[0][0] as { where: Record<string, unknown> }).where;

    beforeEach(() => {
      mockPrisma.component_groups.findUnique.mockResolvedValue({
        id: 3,
        group_name: 'Suspension',
        i18n_key: 'componentGroup.suspension',
        side_choice: false,
      });
      mockPrisma.events_action.findMany.mockResolvedValue([]);
    });

    it('offers only actions whose target parts are mounted on the bike', async () => {
      // ACT
      await service.actionsGroupComponents(3, BIKE_ID, OWNER_ID);

      // ASSERT: an action for a part the bike does not carry is work it cannot receive.
      expect(askedWhere()).toEqual(
        expect.objectContaining({
          event_action_targets: {
            some: {
              component_types: {
                component_group_id: 3,
                components_mounted: { some: { bike_id: BIKE_ID, is_active: true, is_deleted: { not: true } } },
              },
            },
          },
        }),
      );
    });

    it('omits front suspension actions on a bike with a rigid fork', async () => {
      // ARRANGE
      bikeWithSuspension(false, true);

      // ACT
      await service.actionsGroupComponents(3, BIKE_ID, OWNER_ID);

      // ASSERT: only the suspension the bike lacks is filtered out.
      expect(askedWhere()).toEqual(expect.objectContaining({ req_front_suspension: false }));
      expect(askedWhere().req_rear_suspension).toBeUndefined();
    });

    it('omits rear suspension actions on a hardtail', async () => {
      // ARRANGE
      bikeWithSuspension(true, false);

      // ACT
      await service.actionsGroupComponents(3, BIKE_ID, OWNER_ID);

      // ASSERT
      expect(askedWhere()).toEqual(expect.objectContaining({ req_rear_suspension: false }));
      expect(askedWhere().req_front_suspension).toBeUndefined();
    });

    it('offers every suspension action on a full suspension bike', async () => {
      // ARRANGE
      bikeWithSuspension(true, true);

      // ACT
      await service.actionsGroupComponents(3, BIKE_ID, OWNER_ID);

      // ASSERT: nothing to filter, so neither requirement is asked about.
      expect(askedWhere().req_front_suspension).toBeUndefined();
      expect(askedWhere().req_rear_suspension).toBeUndefined();
    });
  });

  describe('attachment upload', () => {
    // Only the fields the service reads - multer hands over far more than this.
    const file = (originalname: string, mimetype: string): Express.Multer.File =>
      ({ originalname, mimetype, buffer: Buffer.from('file') }) as Express.Multer.File;

    it('compresses a photographed receipt on the way up', async () => {
      // ARRANGE
      mockStorage.uploadImageR2CloudFare.mockResolvedValue('https://cdn.test/service-attachments/abc.webp');

      // ACT
      const attachment = await service.uploadAttachment(file('receipt.jpg', 'image/jpeg'));

      // ASSERT: attachments live apart from bike photos, and the stored file is the
      // re-encoded one, so its type is no longer what the phone sent.
      expect(mockStorage.uploadImageR2CloudFare).toHaveBeenCalledWith(expect.any(Buffer), 'service-attachments');
      expect(attachment).toEqual({
        name: 'receipt.jpg',
        url: 'https://cdn.test/service-attachments/abc.webp',
        content_type: 'image/webp',
      });
    });

    it('stores a PDF invoice untouched', async () => {
      // ARRANGE
      mockStorage.uploadPdfR2CloudFare.mockResolvedValue('https://cdn.test/service-attachments/abc.pdf');

      // ACT
      const attachment = await service.uploadAttachment(file('invoice.pdf', 'application/pdf'));

      // ASSERT: a PDF has nothing to resize, so it never reaches the image path.
      expect(mockStorage.uploadPdfR2CloudFare).toHaveBeenCalledWith(expect.any(Buffer), 'service-attachments');
      expect(mockStorage.uploadImageR2CloudFare).not.toHaveBeenCalled();
      expect(attachment).toEqual({
        name: 'invoice.pdf',
        url: 'https://cdn.test/service-attachments/abc.pdf',
        content_type: 'application/pdf',
      });
    });

    it('refuses a file that is neither an image nor a PDF', async () => {
      await expect(service.uploadAttachment(file('notes.txt', 'text/plain'))).rejects.toThrow(BadRequestException);
    });
  });

  describe('editing a saved service', () => {
    const EVENT_ID = 99;
    // Where the work was said to have happened before the correction.
    const OLD_DATE = new Date('2026-07-01T00:00:00.000Z');
    const OLD_WINDOW_START = new Date('2026-07-01T23:59:59.999Z');
    // Where the user moves it to: a month earlier.
    const NEW_DATE = new Date('2026-06-01T00:00:00.000Z');
    const NEW_WINDOW_START = new Date('2026-06-01T23:59:59.999Z');

    // The service as it stands, in the shape the edit reads it back in.
    const saved = (actions: unknown[] = []): Record<string, unknown> => ({
      id: EVENT_ID,
      bike_id: BIKE_ID,
      service_date: OLD_DATE,
      event_actions_done: actions,
    });

    const ordinaryAction = {
      id: 500,
      part_replaced: false,
      action_done_component_map: [{ component_mounted_id: 45 }],
    };

    const replacementAction = {
      id: 501,
      part_replaced: true,
      action_done_component_map: [{ component_mounted_id: 46 }],
    };

    // Rides answered per window, so the edit can tell the old date's wear from the new one's.
    const ridesByWindow = (byStart: Record<string, RideSum>): void => {
      mockTx.rides.aggregate.mockImplementation((args: { where: { started_at?: { gt?: Date; lte?: Date } } }) => {
        const window = args.where.started_at;
        const key = (window?.gt ?? window?.lte)?.toISOString() ?? '';
        return Promise.resolve(aggregateResult(window?.gt ? (byStart[key] ?? {}) : {}));
      });
    };

    beforeEach(() => {
      mockTx.events_bikes.findUnique.mockResolvedValue(saved());
      mockTx.components_mounted.findUnique.mockResolvedValue({
        id: 46,
        bike_id: BIKE_ID,
        component_type_id: 16,
        total_km: 300,
        total_time_min: 900,
        drivetrain_km: 250,
        suspension_min: 0,
        component_types: { component_type: 'Chain' },
      });
    });

    it('changes the note, the total and a price that turned out to be wrong', async () => {
      // ARRANGE
      mockTx.events_bikes.findUnique.mockResolvedValue(saved([ordinaryAction]));

      // ACT
      await service.update(
        EVENT_ID,
        { note: 'Bike Shop XY', total_cost: 2400, actions_updated: [{ action_done_id: 500, partial_cost: 150 }] },
        OWNER_ID,
      );

      // ASSERT: scoped to the service, so an id from someone else's cannot be edited through it.
      expect(mockTx.event_actions_done.updateMany).toHaveBeenCalledWith({
        where: { id: 500, bike_event_id: EVENT_ID },
        data: { partial_cost: 150, note: undefined },
      });
      expect(mockTx.events_bikes.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: EVENT_ID },
          data: expect.objectContaining({ note: 'Bike Shop XY', total_cost: 2400 }),
        }),
      );
    });

    it('refuses to remove an action that replaced a part', async () => {
      // ARRANGE
      mockTx.events_bikes.findUnique.mockResolvedValue(saved([replacementAction]));

      // ACT + ASSERT: the part it fitted may already carry rides or its own replacement,
      // so the removal is refused with something the UI can show - see ADR 0003.
      await expect(service.update(EVENT_ID, { actions_removed: [501] }, OWNER_ID)).rejects.toThrow(BadRequestException);
      expect(mockTx.event_actions_done.deleteMany).not.toHaveBeenCalled();
    });

    it('removes an ordinary action', async () => {
      // ARRANGE
      mockTx.events_bikes.findUnique.mockResolvedValue(saved([ordinaryAction]));

      // ACT
      await service.update(EVENT_ID, { actions_removed: [500] }, OWNER_ID);

      // ASSERT
      expect(mockTx.event_actions_done.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [500] }, bike_event_id: EVENT_ID },
      });
    });

    it('rewinds every baseline when the service date moves earlier', async () => {
      // ARRANGE: 500 km ridden since the new date, 200 of it since the old one.
      mockTx.events_bikes.findUnique.mockResolvedValue(saved([ordinaryAction]));
      ridesByWindow({
        [NEW_WINDOW_START.toISOString()]: { distance_m: 500_000, duration_min: 1500, drivetrain_meters: 400_000 },
        [OLD_WINDOW_START.toISOString()]: { distance_m: 200_000, duration_min: 600, drivetrain_meters: 150_000 },
      });
      mockTx.components_mounted.findUnique.mockResolvedValue({
        id: 45,
        bike_id: BIKE_ID,
        component_type_id: 16,
        total_km: 1000,
        total_time_min: 3000,
        drivetrain_km: 900,
        suspension_min: 0,
        component_types: { component_type: 'Chain' },
      });

      // ACT
      await service.update(EVENT_ID, { service_date: NEW_DATE.toISOString() }, OWNER_ID);

      // ASSERT: the baseline is what the part read on the new date, not the old one.
      expect(mockTx.action_done_component_map.update).toHaveBeenCalledWith({
        where: { event_action_done_id_component_mounted_id: { event_action_done_id: 500, component_mounted_id: 45 } },
        data: {
          km_at_time: 500,
          time_min_at_time: 1500,
          drivetrain_km_at_time: 500,
          suspension_min_at_time: 0,
        },
      });
    });

    it('carries a replaced part back to the new date, with the wear it picked up since', async () => {
      // ARRANGE: the part was fitted on the old date carrying 200 km of wear; from the new
      // date it would have been on the bike for 500.
      mockTx.events_bikes.findUnique.mockResolvedValue(saved([replacementAction]));
      ridesByWindow({
        [NEW_WINDOW_START.toISOString()]: { distance_m: 500_000, duration_min: 1500, drivetrain_meters: 400_000 },
        [OLD_WINDOW_START.toISOString()]: { distance_m: 200_000, duration_min: 600, drivetrain_meters: 150_000 },
      });

      // ACT
      await service.update(EVENT_ID, { service_date: NEW_DATE.toISOString() }, OWNER_ID);

      // ASSERT: the part moves with the work, and gains the 300 km ridden between the two
      // dates on top of the 300 it already carried.
      expect(mockTx.components_mounted.update).toHaveBeenCalledWith({
        where: { id: 46 },
        data: expect.objectContaining({
          mounted_at: NEW_DATE,
          total_km: 600,
          total_time_min: 1800,
          drivetrain_km: 500,
        }),
      });

      // Its baselines stay at zero: on the service date the part had been ridden nowhere.
      expect(mockTx.action_done_component_map.update).not.toHaveBeenCalled();
    });

    it('takes the part that came off back to the new date with it', async () => {
      // ARRANGE
      mockTx.events_bikes.findUnique.mockResolvedValue(saved([replacementAction]));

      // ACT
      await service.update(EVENT_ID, { service_date: NEW_DATE.toISOString() }, OWNER_ID);

      // ASSERT: the old part stopped being worn when the work happened, wherever that was.
      expect(mockTx.components_mounted.updateMany).toHaveBeenCalledWith({
        where: { bike_id: BIKE_ID, is_active: false, removed_at: OLD_DATE, component_type_id: 16 },
        data: { removed_at: NEW_DATE },
      });
    });

    it('leaves the baselines alone when the date is not touched', async () => {
      // ARRANGE
      mockTx.events_bikes.findUnique.mockResolvedValue(saved([ordinaryAction]));

      // ACT
      await service.update(EVENT_ID, { note: 'Typo fixed' }, OWNER_ID);

      // ASSERT
      expect(mockTx.action_done_component_map.update).not.toHaveBeenCalled();
      expect(mockTx.components_mounted.update).not.toHaveBeenCalled();
    });

    it('adds an action, freezing it at the service date like a new one', async () => {
      // ARRANGE: the work was a month ago and 200 km have been ridden since.
      mockTx.components_mounted.findMany.mockResolvedValue([
        { id: 45, total_km: 1000, total_time_min: 3000, drivetrain_km: 900, suspension_min: 2000 },
      ]);
      rides({ distance_m: 200_000, duration_min: 600, drivetrain_meters: 150_000, suspension_min: 400 });

      // ACT
      await service.update(
        EVENT_ID,
        {
          actions_done: [{ action_id: 1, part_replaced: false, mounted_components_involved: [45] }],
        } as Update_BikeEventDto,
        OWNER_ID,
      );

      // ASSERT: the same rewind a create would have applied.
      expect(mockTx.action_done_component_map.createMany).toHaveBeenCalledWith({
        data: [
          {
            event_action_done_id: 500,
            component_mounted_id: 45,
            km_at_time: 800,
            time_min_at_time: 2400,
            drivetrain_km_at_time: 750,
            suspension_min_at_time: 1600,
          },
        ],
      });
    });

    it('adds and removes attachments', async () => {
      // ACT
      await service.update(
        EVENT_ID,
        {
          attachments_added: [{ name: 'invoice.pdf', url: 'https://cdn.test/a.pdf', content_type: 'application/pdf' }],
          attachments_removed: [3],
        },
        OWNER_ID,
      );

      // ASSERT
      expect(mockTx.bike_event_attachments.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [3] }, bike_event_id: EVENT_ID },
      });
      expect(mockTx.bike_event_attachments.createMany).toHaveBeenCalledWith({
        data: [
          {
            bike_event_id: EVENT_ID,
            name: 'invoice.pdf',
            url: 'https://cdn.test/a.pdf',
            content_type: 'application/pdf',
          },
        ],
      });
    });
  });

  describe('history', () => {
    const historyRow = {
      id: 99,
      bike_id: BIKE_ID,
      service_date: SERVICE_DATE,
      created_at: SERVICE_DATE,
      total_cost: new Prisma.Decimal(350.5),
      bikes: { bikename: 'Trail bike', bike_brand: 'Santa Cruz', bike_model: 'Hightower' },
      event_actions_done: [
        { events_action: { action_name: 'Chain Replacement', i18n_key: 'action.chainReplacement' } },
        { events_action: { action_name: 'Brake bleed', i18n_key: 'action.bleed' } },
      ],
    };

    it('returns cards with a total, newest work first', async () => {
      // ARRANGE
      mockPrisma.events_bikes.findMany.mockResolvedValue([historyRow]);
      mockPrisma.events_bikes.count.mockResolvedValue(12);

      // ACT
      const result = await service.history(OWNER_ID, 3, 0);

      // ASSERT: everything a card renders, and the total it pages against.
      expect(result.total).toBe(12);
      expect(result.items).toEqual([
        {
          id: 99,
          bike_id: BIKE_ID,
          bike_name: 'Trail bike',
          service_date: SERVICE_DATE,
          action_count: 2,
          action_names: ['Chain Replacement', 'Brake bleed'],
          total_cost: 350.5,
        },
      ]);

      // Sorted by when the work happened, not when it was typed in.
      expect(mockPrisma.events_bikes.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { service_date: { sort: 'desc', nulls: 'last' } },
          take: 3,
          skip: 0,
        }),
      );
    });

    it('falls back to a default page when no limit is asked for', async () => {
      // ARRANGE: an absent query parameter reaches the service as NaN.
      mockPrisma.events_bikes.findMany.mockResolvedValue([]);
      mockPrisma.events_bikes.count.mockResolvedValue(0);

      // ACT
      await service.history(OWNER_ID, Number.NaN, Number.NaN);

      // ASSERT: a page, not an empty one.
      expect(mockPrisma.events_bikes.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 20, skip: 0 }));
    });

    it("refuses to page through someone else's bike", async () => {
      mockPrisma.bikes.findFirst.mockResolvedValue(null);

      await expect(service.history(OWNER_ID, Number.NaN, Number.NaN, 4711)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('the service detail', () => {
    // One recorded action, as the detail query reads it back: the catalogue action it came
    // from with its tags, and the component whose wear it froze.
    const savedAction = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
      id: 500,
      event_action_id: 3,
      note: 'Shimano XT',
      partial_cost: null,
      bike_km_at_time: 2450,
      bike_minutes_at_time: 4080,
      events_action: {
        action_name: 'Brake bleed',
        i18n_key: 'action.bleed',
        replace_action: false,
        event_action_tags: [{ id: 7, event_action_tag: 'Full Flush', i18n_key: 'actionTag.fullFlush', user_id: null }],
      },
      action_done_component_map: [
        {
          km_at_time: 800,
          time_min_at_time: 2400,
          drivetrain_km_at_time: 750,
          suspension_min_at_time: 1600,
          components_mounted: {
            id: 45,
            component_type_id: 16,
            component_desc: 'SRAM Code RSC',
            position: 'front',
            component_types: { component_type: 'Brake Caliper', i18n_key: 'component.brakeCaliper' },
          },
        },
      ],
      ...overrides,
    });

    const savedService = (actions: Record<string, unknown>[]): Record<string, unknown> => ({
      id: 99,
      bike_id: BIKE_ID,
      note: 'Bike Shop XY',
      total_cost: 2400,
      service_date: SERVICE_DATE,
      created_at: SERVICE_DATE,
      updated_at: null,
      bikes: { user_id: OWNER_ID, bikename: 'Trail bike', bike_brand: 'Santa Cruz', bike_model: 'Hightower' },
      event_actions_done: actions,
      bike_event_attachments: [],
    });

    it('names the bike and reports the odometer as it stood on the service date', async () => {
      // ARRANGE
      mockPrisma.events_bikes.findUnique.mockResolvedValue(savedService([savedAction()]));

      // ACT
      const detail = await service.findById(99, OWNER_ID);

      // ASSERT: the bike at the time of the work, not as it reads today.
      expect(detail.bike_name).toBe('Trail bike');
      expect(detail.bike_km_at_time).toBe(2450);
      expect(detail.bike_minutes_at_time).toBe(4080);
    });

    it('carries the catalogue tags of every action it lists', async () => {
      // ARRANGE
      mockPrisma.events_bikes.findUnique.mockResolvedValue(savedService([savedAction()]));

      // ACT
      const detail = await service.findById(99, OWNER_ID);

      // ASSERT: what the job included, from the catalogue - it is never recorded per
      // occasion, see ADR 0004.
      expect(detail.actions_done[0].action_done_id).toBe(500);
      expect(detail.actions_done[0].tags).toEqual([
        { id: 7, tag: 'Full Flush', i18n_key: 'actionTag.fullFlush', custom: false },
      ]);
      expect(detail.actions_done[0].mounted_components[0].component_type_id).toBe(16);
    });

    it('reports an action with no price recorded as having none', async () => {
      // ARRANGE: work the user did themselves, entered without a figure.
      mockPrisma.events_bikes.findUnique.mockResolvedValue(savedService([savedAction()]));

      // ACT
      const detail = await service.findById(99, OWNER_ID);

      // ASSERT: no price is not the same as a price of zero.
      expect(detail.actions_done[0].partial_cost).toBeNull();
    });

    it('has no odometer reading on a service that carries no actions', async () => {
      // ARRANGE
      mockPrisma.events_bikes.findUnique.mockResolvedValue(savedService([]));

      // ACT
      const detail = await service.findById(99, OWNER_ID);

      // ASSERT: nothing froze the odometer, so there is nothing to report.
      expect(detail.bike_km_at_time).toBeNull();
      expect(detail.bike_minutes_at_time).toBeNull();
    });
  });

  it('subtracts nothing for a service dated today, whatever was ridden today', async () => {
    // ARRANGE: the wizard sends a day, so a service recorded this evening arrives as
    // midnight - with this morning's ride sitting after it.
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    mockTx.components_mounted.findMany.mockResolvedValue([]);
    rides({});

    // ACT
    await service.create(dto({ service_date: today.toISOString(), actions_done: [] }), OWNER_ID);

    // ASSERT: the window opens after every hour of today, so no ride can fall inside it.
    const windowCall = mockTx.rides.aggregate.mock.calls.find(
      ([args]: [{ where: { started_at?: { gt?: Date } } }]) => args.where.started_at?.gt !== undefined,
    );
    const windowStart = (windowCall as [{ where: { started_at: { gt: Date } } }])[0].where.started_at.gt;
    expect(windowStart.getTime()).toBeGreaterThan(Date.now());
  });

  it('does not seed suspension minutes onto a part that never sees them', async () => {
    // ARRANGE: a chain. Ride sync adds suspension minutes to forks and shocks only.
    mockTx.components_mounted.findMany.mockResolvedValue([]);
    mockTx.components_mounted.create.mockResolvedValue({ id: 46 });
    mockTx.component_types.findUnique.mockResolvedValue({ component_type: 'Chain' });
    rides({ distance_m: 200_000, duration_min: 600, drivetrain_meters: 150_000, suspension_min: 400 });

    // ACT
    await service.create(
      dto({
        actions_replaced: [
          {
            old_component_mounted_id: 45,
            component_type_id: 16,
            new_component_desc: 'Shimano XT Chain HG-701',
            action_id: 2,
          },
        ],
      }),
      OWNER_ID,
    );

    // ASSERT: distance and drivetrain carry over, suspension does not.
    expect(mockTx.components_mounted.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ total_km: 200, drivetrain_km: 150, suspension_min: 0 }),
      }),
    );
  });
});
