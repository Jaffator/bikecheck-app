import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CreateBikeDto, CreateBikeWithComponentsDto } from './dto/create-bike.dto';
import { UpdateBikeDto } from './dto/update-bike.dto';
import { ResponseBikeDto, NewBikeFormDataDto } from './dto/response-bike.dto';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import 'dotenv/config';
import path from 'path';
import { Prisma } from '@prisma/client';

@Injectable()
export class BikeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    @InjectPinoLogger(BikeService.name) private readonly logger: PinoLogger,
  ) {}

  async getFormOptions(): Promise<NewBikeFormDataDto> {
    const bikeTypes = await this.prisma.bike_types.findMany({});
    return { bikeTypes };
  }

  async createBikeWithComponents(userId: number, dto: CreateBikeWithComponentsDto): Promise<ResponseBikeDto> {
    let imageUrl = dto.bike.image_url;
    if (imageUrl && !imageUrl.includes(process.env.CLOUDFARE_PUBLIC_URL!)) {
      imageUrl = await this.storeFileFromUrl(imageUrl);
    }

    // Ownership comes from the authenticated user, never from the request body.
    // Fork Basic Service, Fork Full Service, Shock Basic Service, Shock Full Service
    const bikeToSave: CreateBikeDto = { ...dto.bike, user_id: userId, image_url: imageUrl };
    console.log('bikeToSave', bikeToSave);
    return await this.prisma.$transaction(async (db) => {
      // 1.create a new Bike
      const bike = await db.bikes.create({ data: { ...bikeToSave } });

      // 2.create mounted components for the bike
      const validComponents = dto.components.filter((c) => c.component_type_id !== undefined);
      const componentData = validComponents.map((data) => ({
        ...data,
        bike_id: bike.id,
        component_type_id: data.component_type_id,
      }));
      await db.components_mounted.createMany({ data: componentData });

      // 3. copy default intervals based on bike type for newly created bike
      const eventFilter: Prisma.events_actionWhereInput = {};
      if (!bike.has_front_suspension) eventFilter.req_front_suspension = false;
      if (!bike.has_rear_suspension) eventFilter.req_rear_suspension = false;

      const biketype = await db.bike_types.findUnique({ where: { id: bikeToSave.bike_type_id } });
      const defaultIntervals = await db.default_service_intervals.findMany({
        where: {
          category: { has: biketype?.type },
          events_action: eventFilter,
        },
      });
      console.log('defaultIntervals', defaultIntervals);

      await db.bike_service_interval.createMany({
        data: defaultIntervals.map((interval) => ({
          bike_id: bike.id,
          event_actions_id: interval.event_actions_id,
          service_interval_km: interval.service_interval_km,
          service_interval_min: interval.service_interval_min,
          health_index_interval: interval.health_index_interval,
        })),
      });

      return bike as ResponseBikeDto;
    });
  }

  async findAll(): Promise<ResponseBikeDto[]> {
    return this.prisma.bikes.findMany({});
  }

  async findByUser(userId: number): Promise<ResponseBikeDto[]> {
    return this.prisma.bikes.findMany({ where: { user_id: userId } });
  }

  async findByID(id: number, userId: number): Promise<ResponseBikeDto> {
    return this.findOwnedBike(id, userId);
  }

  async update(id: number, userId: number, updateBikeDto: UpdateBikeDto): Promise<ResponseBikeDto> {
    await this.findOwnedBike(id, userId);
    return this.prisma.bikes.update({ where: { id }, data: updateBikeDto });
  }

  async deleteSoft(id: number, userId: number): Promise<ResponseBikeDto> {
    await this.findOwnedBike(id, userId);
    return this.prisma.bikes.update({
      where: { id },
      data: { is_deleted: true, deleted_at: new Date() },
    });
  }

  async deleteHard(id: number, userId: number): Promise<ResponseBikeDto> {
    await this.findOwnedBike(id, userId);
    return this.prisma.bikes.delete({ where: { id } });
  }

  // Returns the bike only if it belongs to the user; otherwise 404 (no ownership leak).
  private async findOwnedBike(id: number, userId: number): Promise<ResponseBikeDto> {
    const bike = await this.prisma.bikes.findFirst({ where: { id, user_id: userId } });
    if (!bike) {
      throw new NotFoundException(`Bike with ID ${id} not found`);
    }
    return bike;
  }

  private async storeFileFromUrl(url: string): Promise<string | undefined> {
    const extname = path.extname(url);
    const response = await fetch(url);

    if (!response.ok) {
      this.logger.error({ custom: true }, `Failed to download file: ${response.statusText}`);
      return undefined; // Return undefined to indicate failure
    }
    try {
      const file = await response.arrayBuffer();
      const buffer = Buffer.from(file);
      const filename = `${randomUUID()}${extname}`;
      return await this.storageService.uploadFileR2CloudFare(buffer, filename, 'bikes');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to upload image to cloud: ${message}`);
      return undefined; // Return undefined to indicate failure
    }
  }
}
