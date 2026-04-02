import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBikeEventDto } from './dto/create-bike-event.dto';
import { UpdateBikeEventDto } from './dto/update-bike-event.dto';
import { ResponseBikeEventDto } from './dto/response-bike-event.dto';
import { Prisma } from '@prisma/client';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class BikeEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBikeEventDto, db: DbClient = this.prisma): Promise<ResponseBikeEventDto> {
    return db.bike_events.create({ data });
  }

  async findAll(): Promise<ResponseBikeEventDto[]> {
    return this.prisma.bike_events.findMany({
      where: { is_deleted: false },
      orderBy: { created_at: 'desc' },
    });
  }

  async findById(id: number): Promise<ResponseBikeEventDto | null> {
    return this.prisma.bike_events.findUnique({
      where: { id, is_deleted: false },
    });
  }

  async findByBikeId(bikeId: number): Promise<ResponseBikeEventDto[]> {
    return this.prisma.bike_events.findMany({
      where: { bike_id: bikeId, is_deleted: false },
      orderBy: { created_at: 'desc' },
    });
  }

  async update(id: number, data: UpdateBikeEventDto): Promise<ResponseBikeEventDto> {
    return this.prisma.bike_events.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
    });
  }

  async softDelete(id: number): Promise<ResponseBikeEventDto> {
    return this.prisma.bike_events.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
    });
  }

  async hardDelete(id: number): Promise<ResponseBikeEventDto> {
    return this.prisma.bike_events.delete({ where: { id } });
  }
}
