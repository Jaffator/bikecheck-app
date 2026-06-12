import { Test, TestingModule } from '@nestjs/testing';
import { BikeService } from './bike.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

describe('BikeService', () => {
  let service: BikeService;

  const mockPrisma = {
    bikes: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    bike_sizes: { findMany: jest.fn() },
    bike_types: { findMany: jest.fn() },
    ride_styles: { findMany: jest.fn() },
    wheel_sizes: { findMany: jest.fn() },
    components_mounted: { createMany: jest.fn() },
    $transaction: jest.fn(),
  };

  const mockStorageService = {
    uploadFileR2CloudFare: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BikeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<BikeService>(BikeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
