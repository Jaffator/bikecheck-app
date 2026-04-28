import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBikeDto } from './dto/create-bike.dto';
import { ResponseBikeDto } from './dto/response-bike.dto';
import 'dotenv/config';
import { Prisma } from '@prisma/client';
import { NewBikeFormData } from './types/bike.types';
type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class BikeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createBike(bikeData: CreateBikeDto, db: DbClient = this.prisma): Promise<ResponseBikeDto> {
    return db.bikes.create({
      data: {
        ...bikeData,
      },
    });
  }

  async getBikeOptions(): Promise<NewBikeFormData> {
    const [bikeSizes, bikeTypes, rideStyles, wheelSizes] = await Promise.all([
      this.prisma.bike_sizes.findMany({}),
      this.prisma.bike_types.findMany({}),
      this.prisma.ride_styles.findMany({}),
      this.prisma.wheel_sizes.findMany({}),
    ]);
    return {
      bikeSizes,
      bikeTypes,
      rideStyles,
      wheelSizes,
    };
  }

  async findAll(): Promise<ResponseBikeDto[]> {
    return this.prisma.bikes.findMany({});
  }
  async findById(id: number): Promise<ResponseBikeDto | null> {
    return this.prisma.bikes.findUnique({ where: { id } });
  }
  async updateBike(id: number, data: Partial<CreateBikeDto>): Promise<ResponseBikeDto> {
    return this.prisma.bikes.update({ where: { id }, data });
  }
  async hardDeleteBike(id: number): Promise<ResponseBikeDto> {
    return this.prisma.bikes.delete({ where: { id } });
  }
  async softDeleteBike(id: number): Promise<ResponseBikeDto> {
    return this.prisma.bikes.update({
      where: { id },
      data: { is_deleted: true, deleted_at: new Date() },
    });
  }
}

// async function run() {
//   const prisma = new PrismaService();

//   try {
//     const repository = new BikeRepository(prisma);
//     const result = await repository.getBikeOptions();
//     console.log(result);
//   } catch (error) {
//     console.error('Error creating bike:', error);
//   } finally {
//     await prisma.onModuleDestroy();
//   }
// }

// run().catch(console.error);
