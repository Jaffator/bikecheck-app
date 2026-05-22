import { Test, TestingModule } from '@nestjs/testing';
import { BikeRepository } from './bike.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBikeDto } from './dto/create-bike.dto';
import { runSeed } from 'scripts/seedData/main_tests';

describe('BikeRepository (integration)', () => {
  let repository: BikeRepository;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  beforeAll(async (): Promise<void> => {
    // Check if running against test database
    if (!process.env.DATABASE_URL?.includes('test')) {
      throw new Error('⚠️ Test must run against test database! Check DATABASE_URL');
    }
    // Connect to test database and get repository instance
    moduleRef = await Test.createTestingModule({
      providers: [BikeRepository, PrismaService],
    }).compile();
    repository = moduleRef.get<BikeRepository>(BikeRepository);
    prisma = moduleRef.get<PrismaService>(PrismaService);
    await prisma.$connect();

    // const testuser: CreateUserDto = {
    //   name: 'Test User',
    //   email: 'testuser@example.com',
    //   password: 'password123',
    //   googleId: '',
    // };
    // await prisma.users.create({
    //   data: { ...testuser },
    // });
    // await runSeed();
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
    const bikeBrand = await prisma.bike_brands.findFirst({});
    const user = await prisma.users.findFirst({});

    const dto: CreateBikeDto = {
      organization_id: undefined,
      user_id: user!.id,
      bike_brand: bikeBrand!.bike_brand,
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
    const user = await prisma.users.findFirst({});
    const bikeType = await prisma.bike_types.findFirst({});
    const wheelSize = await prisma.wheel_sizes.findFirst({});
    const bikeSize = await prisma.bike_sizes.findFirst({});
    const bikeBrand = await prisma.bike_brands.findFirst({});
    const bike = await prisma.bikes.findFirst({ where: { bikename: 'Tarmac SL7' } });

    const updateDto: CreateBikeDto = {
      organization_id: undefined,
      user_id: user!.id,
      bike_type_id: bikeType!.id,
      wheel_size_id: wheelSize!.id,
      bike_size_id: bikeSize!.id,
      bike_brand: bikeBrand!.bike_brand,
      bikename: 'Tarmac',
      year: 2025,
      description: '',
      mileage_km: 1000,
      frame_material: '',
    };
    // ACT
    const findBike = await repository.updateBike(bike!.id, updateDto);

    // ASSERT
    expect(findBike).not.toBeNull();
    expect(findBike.bikename).toBe('Tarmac');
    expect(findBike.year).toBe(2025);
    expect(findBike.mileage_km).toBe(1000);
  });

  it('soft delete bike', async (): Promise<void> => {
    // ARRANGE
    const bike = await prisma.bikes.findFirst({});

    // ACT
    const softDeletedBike = await repository.softDeleteBike(bike!.id);

    // ASSERT
    expect(softDeletedBike.is_deleted).toBe(true);
    expect(softDeletedBike.deleted_at).not.toBeNull();
    expect(softDeletedBike?.id).toBe(bike!.id);
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
