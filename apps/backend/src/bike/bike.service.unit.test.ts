import { Test, TestingModule } from '@nestjs/testing';
import { BikeService } from './bike.service';
import { BikeRepository } from './bike.repository';

describe('BikeService', () => {
  let service: BikeService;
  let repository: BikeRepository;

  const mockBikeRepository = {
    createBike: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    updateBike: jest.fn(),
    hardDeleteBike: jest.fn(),
    softDeleteBike: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BikeService, { provide: BikeRepository, useValue: mockBikeRepository }],
    }).compile();

    service = module.get<BikeService>(BikeService);
    repository = module.get<BikeRepository>(BikeRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create a bike', async () => {
    // ARRANGE
    const createBikeDto = {
      bike_brand_id: 1,
      year: 2025,
      mileage_km: 1250,
      bikename: 'testnamebike',
    } as unknown as Parameters<BikeService['create']>[0];

    const bike = {
      ...createBikeDto,
      id: 1,
    };

    mockBikeRepository.createBike.mockResolvedValue(bike);

    // ACT
    const result = await service.create(createBikeDto);

    // ASSERT
    expect(result).toEqual(bike);
  });
  it('findall bikes', async () => {});
  it('find bike ID', async () => {});
  it('update bike', async () => {});
  it('delete soft bike', async () => {});
  it('delete hard bike', async () => {});
});
