import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBikeDto } from './dto/create-bike.dto';
import { ResponseBikeDto } from './dto/response-bike.dto';
import 'dotenv/config';
import { Prisma } from '@prisma/client';
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
//   await prisma.onModuleInit();

//   try {
//     const repository = new BikeRepository(prisma);
//     const result = await repository.createBike({
//       user_id: 38,
//       bike_brand: 'Trek shit',
//       bike_model: 'Domane SL 7ss',
//       bike_type_id: 50,
//       frame_material: 'Carbon',
//       image_url: 'https://example.com/bike-image.jpg',
//     });
//   } catch (error) {
//     console.error('Error creating bike:', error);
//   } finally {
//     await prisma.onModuleDestroy();
//   }
// }

// run().catch(console.error);
