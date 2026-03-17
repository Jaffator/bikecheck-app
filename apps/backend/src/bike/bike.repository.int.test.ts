import { Test, TestingModule } from '@nestjs/testing';
import { BikeRepository } from './bike.repository';
import { PrismaService } from '../../shared/prisma.service';
import { CreateBikeDto } from './dto/create-bike.dto';

describe('BikeRepository (integration)', () => {
  let repository: BikeRepository;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  beforeAll(async (): Promise<void> => {
    // Kontrola že běží test DB
    if (!process.env.DATABASE_URL?.includes('test')) {
      throw new Error('⚠️ Test must run against test database! Check DATABASE_URL');
    }
    moduleRef = await Test.createTestingModule({
      providers: [BikeRepository, PrismaService],
    }).compile();

    repository = moduleRef.get<BikeRepository>(BikeRepository);
    prisma = moduleRef.get<PrismaService>(PrismaService);

    await prisma.$connect();
  });

  beforeEach(async (): Promise<void> => {
    // Pouze test DB
    // await prisma.bikes.deleteMany({});
  });

  afterAll(async (): Promise<void> => {
    await prisma.$disconnect();
    await new Promise((resolve) => setTimeout(resolve, 800));
    await moduleRef.close();
  });

  it('Create bike', async (): Promise<void> => {
    const bikeType = await prisma.bike_types.findFirst({});
    const wheelSize = await prisma.wheel_sizes.findFirst({});
    const bikeSize = await prisma.bike_sizes.findFirst({});
    const bike_brand_model_id = await prisma.bike_models.findFirst({});

    const dto: CreateBikeDto = {
      bike_brand_model_id: bike_brand_model_id!.id,
      bike_type_id: bikeType!.id,
      wheel_size_id: wheelSize!.id,
      bike_size_id: bikeSize!.id,
      bikename: 'Tarmac SL7',
      year: 2024,
      description: '',
      mileage_km: 0,
      frame_material: '',
    };

    const created = await repository.createBike(dto);

    const fromDb = await prisma.bikes.findUnique({
      where: { id: created.id },
    });

    expect(fromDb).not.toBeNull();
    expect(fromDb?.bikename).toBe('Tarmac SL7');
    expect(fromDb?.year).toBe(2024);
  });
  it('FindAll bike', async (): Promise<void> => {
    // ARRANGE
    const countBikes = await prisma.bikes.count();
    // ACT
    const findAll = await repository.findAll();

    // ASSERT
    expect(findAll.length).toEqual(countBikes);
  });

  it('findById bike', async (): Promise<void> => {
    // ARRANGE
    const bikes = await prisma.bikes.findFirst({});
    // ACT
    const findBike = await repository.findById(bikes!.id);

    // ASSERT
    expect(findBike).not.toBeNull();
    expect(findBike?.id).toBe(bikes!.id);
  });

  it('update bike', async (): Promise<void> => {
    // ARRANGE
    const idBikeToUpdate = await prisma.bikes.findFirst({});
    const bikeType = await prisma.bike_types.findFirst({});
    const wheelSize = await prisma.wheel_sizes.findFirst({});
    const bikeSize = await prisma.bike_sizes.findFirst({});
    const bikeModel = await prisma.bike_models.findFirst({});

    const dto: CreateBikeDto = {
      bike_type_id: bikeType!.id,
      wheel_size_id: wheelSize!.id,
      bike_size_id: bikeSize!.id,
      bike_brand_model_id: bikeModel!.id,
      bikename: 'Tarmac',
      year: 2025,
      description: '',
      mileage_km: 1000,
      frame_material: '',
    };
    // ACT
    const findBike = await repository.updateBike(idBikeToUpdate!.id, dto);

    // ASSERT
    expect(findBike).not.toBeNull();
    expect(findBike.bikename).toBe('Tarmac');
    expect(findBike.year).toBe(2025);
    expect(findBike.mileage_km).toBe(1000);
    expect(findBike?.id).toBe(idBikeToUpdate!.id);
  });

  it('soft delete bike', async (): Promise<void> => {
    // ARRANGE
    const idBikeToSoftDelete = await prisma.bikes.findFirst({});

    // ACT
    const softDeletedBike = await repository.softDeleteBike(idBikeToSoftDelete!.id);

    // ASSERT
    expect(softDeletedBike.is_deleted).toBe(true);
    expect(softDeletedBike.deleted_at).not.toBeNull();
    expect(softDeletedBike?.id).toBe(idBikeToSoftDelete!.id);
  });

  // it('hard delete bike', async (): Promise<void> => {
  //   // ARRANGE
  //   const idBikeToDelete = await prisma.bikes.findFirst({});

  //   // ACT
  //   const hardDeletedBike = await repository.hardDeleteBike(idBikeToDelete!.id);

  //   // ASSERT
  //   expect(hardDeletedBike).not.toBeNull();
  //   expect(hardDeletedBike?.id).toBe(idBikeToDelete!.id);
  // });
});
