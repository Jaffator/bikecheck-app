import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getLoggerToken } from 'nestjs-pino';
import { Prisma } from '@prisma/client';
import { BikeService } from './bike.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { StatsService } from '../stats/stats.service';
import { ServiceTrackingService } from '../service-tracking/service-tracking.service';

const OWNER_ID = 7;
const STRANGER_ID = 8;
const BIKE_ID = 15;
const BIKE_TYPE_ID = 3;
const STORED_IMAGE = 'https://storage.example.com/bikes/tarmac.webp';
// Every bike read carries its type row, so the response can name the type.
const WITH_TYPE = { bike_types: true };
const NEW_IMAGE = 'https://storage.example.com/bikes/tarmac-new.webp';

type Row = Record<string, unknown>;

// One ride of a bike, as both the ride sums and the distance chart read it.
function ride(bikeId: number, minutes: number): Row {
  return {
    bike_id: bikeId,
    started_at: new Date('2026-03-01T09:00:00.000Z'),
    distance_m: 20000,
    duration_min: minutes,
    is_deleted: false,
  };
}

// Each bike's colour by its id, the way a list reads it.
function colors(bikes: { id: number; color_index: number }[]): Record<number, number> {
  return Object.fromEntries(bikes.map(({ id, color_index }) => [id, color_index]));
}

// true is the archive, { not: true } the garage, and no flag at all is every bike.
function inState(bike: Row, wanted: unknown): boolean {
  if (wanted === undefined) return true;
  return wanted === true ? bike.is_deleted === true : bike.is_deleted !== true;
}

describe('BikeService', () => {
  let service: BikeService;
  let stats: StatsService;
  let garage: Row[];
  let rides: Row[];

  const mockPrisma = {
    bikes: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    bike_types: { findMany: jest.fn(), findUnique: jest.fn() },
    rides: { findMany: jest.fn(), groupBy: jest.fn() },
    components_mounted: { createMany: jest.fn() },
    strava_pending_activities: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };

  const mockStorageService = {
    uploadImageR2CloudFare: jest.fn(),
  };

  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  // The bike the owner already has, as the row a read answers with.
  const bikeRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: BIKE_ID,
    user_id: OWNER_ID,
    bike_brand: 'Specialized',
    bike_model: 'S-Works Tarmac SL8',
    bikename: 'Tarmac',
    year: 2024,
    bike_type_id: BIKE_TYPE_ID,
    image_url: STORED_IMAGE,
    bike_weight_kg: new Prisma.Decimal('7.25'),
    total_elevation_m: 15623,
    total_km: 12474,
    bike_types: { type: 'Road' },
    total_time_min: 9360,
    is_deleted: false,
    ...overrides,
  });

  // What the multipart PATCH hands the service once its JSON body is parsed.
  const imageFile = (): Express.Multer.File =>
    ({ buffer: Buffer.from('image-bytes'), originalname: 'tarmac.jpg' }) as Express.Multer.File;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BikeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorageService },
        { provide: getLoggerToken(BikeService.name), useValue: mockLogger },
        StatsService,
        { provide: ServiceTrackingService, useValue: {} },
      ],
    }).compile();

    service = module.get<BikeService>(BikeService);
    stats = module.get<StatsService>(StatsService);

    // The owner's bikes in the state asked for, and their rides grouped the way the database would.
    garage = [bikeRow()];
    rides = [];
    const archived = (bikeId: unknown): boolean =>
      garage.some((bike) => bike.id === bikeId && bike.is_deleted === true);
    mockPrisma.bikes.findMany.mockImplementation(({ where }: { where: { is_deleted?: unknown } }) =>
      Promise.resolve(garage.filter((bike) => inState(bike, where.is_deleted))),
    );
    mockPrisma.rides.groupBy.mockImplementation(
      ({ where }: { where: { bike_id: { in: number[] }; is_deleted?: unknown } }) =>
        Promise.resolve(
          where.bike_id.in.flatMap((bikeId) => {
            const counted = rides.filter(
              (row) => row.bike_id === bikeId && (where.is_deleted === undefined || row.is_deleted !== true),
            );
            const minutes = counted.reduce((total, row) => total + (row.duration_min as number), 0);
            return counted.length === 0
              ? []
              : [{ bike_id: bikeId, _count: { _all: counted.length }, _sum: { duration_min: minutes } }];
          }),
        ),
    );
    mockPrisma.rides.findMany.mockImplementation(({ where }: { where: { started_at: { gte: Date; lt: Date } } }) =>
      Promise.resolve(
        rides.filter((row) => {
          const date = row.started_at as Date;
          const inSpan = date >= where.started_at.gte && date < where.started_at.lt;
          return inSpan && row.is_deleted !== true && !archived(row.bike_id);
        }),
      ),
    );

    // The caller owns the bike unless a test says otherwise, and the update answers
    // with the row it just wrote.
    mockPrisma.bikes.findFirst.mockResolvedValue(bikeRow());
    mockPrisma.bikes.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...bikeRow(), ...data }),
    );
    mockStorageService.uploadImageR2CloudFare.mockResolvedValue(NEW_IMAGE);
    mockPrisma.bikes.delete.mockImplementation(() => Promise.resolve(bikeRow({ is_deleted: true })));
    mockPrisma.strava_pending_activities.deleteMany.mockResolvedValue({ count: 0 });
    // Archiving runs in one transaction, handed the same mocked client.
    mockPrisma.$transaction.mockImplementation((work: (db: typeof mockPrisma) => unknown) => work(mockPrisma));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('update', () => {
    it('writes the fields it was given', async () => {
      await service.update(BIKE_ID, OWNER_ID, { bikename: 'Rakeťák', year: 2025 });

      expect(mockPrisma.bikes.update).toHaveBeenCalledWith({
        where: { id: BIKE_ID },
        data: expect.objectContaining({ bikename: 'Rakeťák', year: 2025 }),
        include: WITH_TYPE,
      });
    });

    it('writes the weight and the elevation the detail page reads', async () => {
      await service.update(BIKE_ID, OWNER_ID, { bike_weight_kg: 15.8, total_elevation_m: 15623 });

      expect(mockPrisma.bikes.update).toHaveBeenCalledWith({
        where: { id: BIKE_ID },
        data: expect.objectContaining({ bike_weight_kg: 15.8, total_elevation_m: 15623 }),
        include: WITH_TYPE,
      });
    });

    it('keeps the decimal in a weight rather than rounding it', async () => {
      const bike = await service.update(BIKE_ID, OWNER_ID, { bike_weight_kg: 7.25 });

      expect(mockPrisma.bikes.update).toHaveBeenCalledWith({
        where: { id: BIKE_ID },
        data: expect.objectContaining({ bike_weight_kg: 7.25 }),
        include: WITH_TYPE,
      });
      expect(Number(bike.bike_weight_kg)).toBeCloseTo(7.25, 2);
    });

    it('touches only the fields it names', async () => {
      await service.update(BIKE_ID, OWNER_ID, { bikename: 'Rakeťák' });

      const { data } = mockPrisma.bikes.update.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(Object.keys(data)).toEqual(['bikename']);
    });

    it('resolves the bike type by name, the way create does', async () => {
      mockPrisma.bike_types.findUnique.mockResolvedValue({ id: 9, type: 'Enduro' });

      await service.update(BIKE_ID, OWNER_ID, { bike_type: 'Enduro' });

      const { data } = mockPrisma.bikes.update.mock.calls[0][0] as { data: Record<string, unknown> };
      // The name is not a column, so it must never reach Prisma.
      expect(data).not.toHaveProperty('bike_type');
      expect(data).toMatchObject({ bike_type_id: 9 });
    });

    it('refuses a bike type nobody has heard of', async () => {
      mockPrisma.bike_types.findUnique.mockResolvedValue(null);

      await expect(service.update(BIKE_ID, OWNER_ID, { bike_type: 'Hovercraft' })).rejects.toThrow(NotFoundException);
      expect(mockPrisma.bikes.update).not.toHaveBeenCalled();
    });

    it('leaves the existing photo alone when no image was sent', async () => {
      await service.update(BIKE_ID, OWNER_ID, { bikename: 'Rakeťák' });

      const { data } = mockPrisma.bikes.update.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(data).not.toHaveProperty('image_url');
      expect(mockStorageService.uploadImageR2CloudFare).not.toHaveBeenCalled();
    });

    it('stores a new photo and writes its address', async () => {
      await service.update(BIKE_ID, OWNER_ID, { bikename: 'Rakeťák' }, imageFile());

      expect(mockStorageService.uploadImageR2CloudFare).toHaveBeenCalled();
      expect(mockPrisma.bikes.update).toHaveBeenCalledWith({
        where: { id: BIKE_ID },
        data: expect.objectContaining({ image_url: NEW_IMAGE }),
        include: WITH_TYPE,
      });
    });

    it('keeps the existing photo when the upload fails', async () => {
      mockStorageService.uploadImageR2CloudFare.mockRejectedValue(new Error('storage is down'));

      await service.update(BIKE_ID, OWNER_ID, { bikename: 'Rakeťák' }, imageFile());

      const { data } = mockPrisma.bikes.update.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(data).not.toHaveProperty('image_url');
    });

    it('names the bike type rather than handing out an id the client cannot resolve', async () => {
      const bike = await service.update(BIKE_ID, OWNER_ID, { bikename: 'Rakeťák' });

      expect(bike.bike_type).toBe('Road');
    });

    it('does not reach another user bike', async () => {
      mockPrisma.bikes.findFirst.mockResolvedValue(null);

      await expect(service.update(BIKE_ID, STRANGER_ID, { bikename: 'Rakeťák' })).rejects.toThrow(NotFoundException);
      expect(mockPrisma.bikes.update).not.toHaveBeenCalled();
    });

    it('does not reach a deleted bike', async () => {
      await service.update(BIKE_ID, OWNER_ID, { bikename: 'Rakeťák' });

      expect(mockPrisma.bikes.findFirst).toHaveBeenCalledWith({
        where: { id: BIKE_ID, user_id: OWNER_ID, is_deleted: { not: true } },
        include: WITH_TYPE,
      });
    });
  });
  describe('findByUser', () => {
    it('serves the garage by default', async () => {
      mockPrisma.bikes.findMany.mockResolvedValue([bikeRow()]);

      await service.findByUser(OWNER_ID);

      expect(mockPrisma.bikes.findMany).toHaveBeenCalledWith({
        where: { user_id: OWNER_ID, is_deleted: { not: true } },
        include: WITH_TYPE,
      });
    });

    it('serves the archive when asked for it', async () => {
      mockPrisma.bikes.findMany.mockResolvedValue([bikeRow({ is_deleted: true })]);

      await service.findByUser(OWNER_ID, true);

      expect(mockPrisma.bikes.findMany).toHaveBeenCalledWith({
        where: { user_id: OWNER_ID, is_deleted: true },
        include: WITH_TYPE,
      });
    });

    it("colours each bike by its rank among all the owner's bikes, in the garage and the archive alike", async () => {
      // ARRANGE: the middle bike by id is archived.
      garage = [bikeRow({ id: 15 }), bikeRow({ id: 16, is_deleted: true }), bikeRow({ id: 17 })];

      // ACT
      const active = await service.findByUser(OWNER_ID);
      const archived = await service.findByUser(OWNER_ID, true);

      // ASSERT: the archived bike keeps its slot, so neither list has a gap filled.
      expect(colors(active)).toEqual({ 15: 0, 17: 2 });
      expect(colors(archived)).toEqual({ 16: 1 });
    });

    it("leaves every other bike's colour as it was when one is archived", async () => {
      // ARRANGE
      garage = [bikeRow({ id: 15 }), bikeRow({ id: 16 }), bikeRow({ id: 17 })];
      const before = colors(await service.findByUser(OWNER_ID));

      // ACT
      garage = [bikeRow({ id: 15 }), bikeRow({ id: 16, is_deleted: true }), bikeRow({ id: 17 })];
      const after = colors(await service.findByUser(OWNER_ID));

      // ASSERT
      expect(before).toEqual({ 15: 0, 16: 1, 17: 2 });
      expect(after).toEqual({ 15: 0, 17: 2 });
    });

    it('gives each bike the colour the distance chart gives it', async () => {
      // ARRANGE: every bike rode this year, and one of them has since been archived.
      jest.useFakeTimers().setSystemTime(new Date('2026-06-15T10:00:00.000Z'));
      garage = [bikeRow({ id: 15 }), bikeRow({ id: 16, is_deleted: true }), bikeRow({ id: 17 }), bikeRow({ id: 18 })];
      rides = [ride(15, 60), ride(16, 60), ride(17, 60), ride(18, 60)];

      // ACT
      const bikes = await service.findByUser(OWNER_ID);
      const distance = await stats.getDistance(OWNER_ID);
      jest.useRealTimers();

      // ASSERT
      expect(colors(bikes)).toEqual({ 15: 0, 17: 2, 18: 3 });
      expect(colors(distance.bikes.map(({ bike_id, color_index }) => ({ id: bike_id, color_index })))).toEqual(
        colors(bikes),
      );
    });

    it("sums each bike's rides for its lifetime, leaving deleted rides out and a bike never ridden at 0", async () => {
      // ARRANGE: the typed-in odometer says 9 360 minutes; the rides say otherwise.
      garage = [bikeRow({ id: 15, total_time_min: 9360 }), bikeRow({ id: 16, total_time_min: 9360 })];
      rides = [ride(15, 95), ride(15, 40), { ...ride(15, 300), is_deleted: true }];

      // ACT
      const bikes = await service.findByUser(OWNER_ID);

      // ASSERT
      expect(bikes.map(({ id, ride_count, ride_time_min }) => ({ id, ride_count, ride_time_min }))).toEqual([
        { id: 15, ride_count: 2, ride_time_min: 135 },
        { id: 16, ride_count: 0, ride_time_min: 0 },
      ]);
    });
  });

  describe('findByID', () => {
    // The detail of an Archived Bike is what the archive opens; the client reads the
    // read-only state off is_deleted.
    it('serves an archived bike', async () => {
      mockPrisma.bikes.findFirst.mockResolvedValue(bikeRow({ is_deleted: true }));

      const bike = await service.findByID(BIKE_ID, OWNER_ID);

      expect(mockPrisma.bikes.findFirst).toHaveBeenCalledWith({
        where: { id: BIKE_ID, user_id: OWNER_ID },
        include: WITH_TYPE,
      });
      expect(bike.is_deleted).toBe(true);
    });
  });

  describe('archive', () => {
    it('sets the flag and the moment it was archived', async () => {
      await service.archive(BIKE_ID, OWNER_ID);

      const { data } = mockPrisma.bikes.update.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(data.is_deleted).toBe(true);
      expect(data.deleted_at).toBeInstanceOf(Date);
    });

    it('unpairs the bike from Strava, so it collects no more kilometres', async () => {
      mockPrisma.bikes.findFirst.mockResolvedValue(bikeRow({ strava_gear_id: 'b123', strava_name: 'Tarmac' }));

      await service.archive(BIKE_ID, OWNER_ID);

      const { data } = mockPrisma.bikes.update.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(data).toMatchObject({ strava_gear_id: null, strava_name: null });
    });

    it('discards the rides still waiting on that gear, rather than asking about them', async () => {
      mockPrisma.bikes.findFirst.mockResolvedValue(bikeRow({ strava_gear_id: 'b123' }));

      await service.archive(BIKE_ID, OWNER_ID);

      expect(mockPrisma.strava_pending_activities.deleteMany).toHaveBeenCalledWith({
        where: { user_id: OWNER_ID, gear_id: 'b123', resolved_at: null },
      });
    });

    it('leaves pending rides alone when the bike was never paired', async () => {
      mockPrisma.bikes.findFirst.mockResolvedValue(bikeRow({ strava_gear_id: null }));

      await service.archive(BIKE_ID, OWNER_ID);

      expect(mockPrisma.strava_pending_activities.deleteMany).not.toHaveBeenCalled();
    });

    it('does not reach another user bike', async () => {
      mockPrisma.bikes.findFirst.mockResolvedValue(null);

      await expect(service.archive(BIKE_ID, STRANGER_ID)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.bikes.update).not.toHaveBeenCalled();
    });
  });

  describe('unarchive', () => {
    it('clears the flag and the timestamp', async () => {
      mockPrisma.bikes.findFirst.mockResolvedValue(bikeRow({ is_deleted: true, deleted_at: new Date() }));

      await service.unarchive(BIKE_ID, OWNER_ID);

      expect(mockPrisma.bikes.update).toHaveBeenCalledWith({
        where: { id: BIKE_ID },
        data: { is_deleted: false, deleted_at: null },
        include: WITH_TYPE,
      });
    });

    // The owner picks the gear again; nothing here hands the pairing back.
    it('does not restore the Strava pairing', async () => {
      mockPrisma.bikes.findFirst.mockResolvedValue(bikeRow({ is_deleted: true }));

      await service.unarchive(BIKE_ID, OWNER_ID);

      const { data } = mockPrisma.bikes.update.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(data).not.toHaveProperty('strava_gear_id');
      expect(data).not.toHaveProperty('strava_name');
    });
  });

  describe('deleteHard', () => {
    it('refuses a bike that is not archived', async () => {
      mockPrisma.bikes.findFirst.mockResolvedValue(bikeRow({ is_deleted: false }));

      await expect(service.deleteHard(BIKE_ID, OWNER_ID)).rejects.toThrow(ConflictException);
      expect(mockPrisma.bikes.delete).not.toHaveBeenCalled();
    });

    // Rows written before the flag existed hold null, and those are live bikes too.
    it('refuses a bike whose flag was never written', async () => {
      mockPrisma.bikes.findFirst.mockResolvedValue(bikeRow({ is_deleted: null }));

      await expect(service.deleteHard(BIKE_ID, OWNER_ID)).rejects.toThrow(ConflictException);
      expect(mockPrisma.bikes.delete).not.toHaveBeenCalled();
    });

    it('destroys an archived bike', async () => {
      mockPrisma.bikes.findFirst.mockResolvedValue(bikeRow({ is_deleted: true }));

      await service.deleteHard(BIKE_ID, OWNER_ID);

      expect(mockPrisma.bikes.delete).toHaveBeenCalledWith({ where: { id: BIKE_ID }, include: WITH_TYPE });
    });

    it('does not reach another user bike', async () => {
      mockPrisma.bikes.findFirst.mockResolvedValue(null);

      await expect(service.deleteHard(BIKE_ID, STRANGER_ID)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.bikes.delete).not.toHaveBeenCalled();
    });
  });
});
