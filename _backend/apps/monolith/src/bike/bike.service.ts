import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBikeDto, CreateBikeWithComponentsDto } from './dto/create-bike.dto';
import { UpdateBikeDto } from './dto/update-bike.dto';
import { ResponseBikeDto, NewBikeFormDataDto } from './dto/response-bike.dto';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import 'dotenv/config';
import path from 'path';
import { defer } from 'rxjs';

@Injectable()
export class BikeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async getFormOptions(): Promise<NewBikeFormDataDto> {
    const [bikeSizes, bikeTypes, rideStyles, wheelSizes] = await Promise.all([
      this.prisma.bike_sizes.findMany({}),
      this.prisma.bike_types.findMany({}),
      this.prisma.ride_styles.findMany({}),
      this.prisma.wheel_sizes.findMany({}),
    ]);
    return { bikeSizes, bikeTypes, rideStyles, wheelSizes };
  }

  async createBikeWithComponents(userId: number, dto: CreateBikeWithComponentsDto): Promise<ResponseBikeDto> {
    const imageUrl = dto.bike.image_url;
    // if (imageUrl && !imageUrl.includes(process.env.CLOUDFARE_PUBLIC_URL!)) {
    //   imageUrl = await this.storeFileFromUrl(imageUrl);
    // }

    // Ownership comes from the authenticated user, never from the request body.
    const bikeToSave: CreateBikeDto = { ...dto.bike, user_id: userId, image_url: imageUrl };
    console.log('bikeToSave', bikeToSave);
    return await this.prisma.$transaction(async (db) => {
      const bike = await db.bikes.create({ data: { ...bikeToSave } });

      const validComponents = dto.components.filter((c) => c.component_type_id !== undefined);
      const componentData = validComponents.map((data) => ({
        ...data,
        bike_id: bike.id,
        component_type_id: data.component_type_id,
      }));
      const biketype = await db.bike_types.findUnique({ where: { id: bikeToSave.bike_type_id } });
      const defaultIntervals = await db.default_service_intervals.findMany({
        where: { category: { has: biketype?.type } },
      });
      console.log(defaultIntervals);
      await db.components_mounted.createMany({ data: componentData });

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

  private async storeFileFromUrl(url: string): Promise<string> {
    const extname = path.extname(url);
    const response = await fetch(url);

    if (!response.ok) {
      throw new BadRequestException(`Failed to download file: ${response.statusText}`);
    }
    try {
      const file = await response.arrayBuffer();
      const buffer = Buffer.from(file);
      const filename = `${randomUUID()}${extname}`;
      return await this.storageService.uploadFileR2CloudFare(buffer, filename, 'bikes');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Failed to upload image to cloud: ${message}`);
    }
  }
}
