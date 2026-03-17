import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { CreateBikeDto } from './dto/create-bike.dto';
import { ResponseBikeDto } from './dto/response-bike.dto';

@Injectable()
export class BikeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createBike(data: CreateBikeDto): Promise<ResponseBikeDto> {
    return this.prisma.bikes.create({ data });
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
