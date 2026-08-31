import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getLoggerToken } from 'nestjs-pino';
import { Prisma } from '@prisma/client';
import { BikeService } from './bike.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const OWNER_ID = 7;
const STRANGER_ID = 8;
const BIKE_ID = 15;
const BIKE_TYPE_ID = 3;
const STORED_IMAGE = 'https://storage.example.com/bikes/tarmac.webp';
// Every bike read carries its type row, so the response can name the type.
const WITH_TYPE = { bike_types: true };
const NEW_IMAGE = 'https://storage.example.com/bikes/tarmac-new.webp';

describe('BikeService', () => {
  let service: BikeService;

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
    components_mounted: { createMany: jest.fn() },
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
      ],
    }).compile();

    service = module.get<BikeService>(BikeService);

    // The caller owns the bike unless a test says otherwise, and the update answers
    // with the row it just wrote.
    mockPrisma.bikes.findFirst.mockResolvedValue(bikeRow());
    mockPrisma.bikes.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...bikeRow(), ...data }),
    );
    mockStorageService.uploadImageR2CloudFare.mockResolvedValue(NEW_IMAGE);
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
});
