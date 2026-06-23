import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBikeDto, CreateBikeWithComponentsDto } from './dto/create-bike.dto';
import { UpdateBikeDto } from './dto/update-bike.dto';
import { ResponseBikeDto, NewBikeFormDataDto } from './dto/response-bike.dto';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import 'dotenv/config';
import path from 'path';

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

  async createBikeWithComponents(dto: CreateBikeWithComponentsDto): Promise<ResponseBikeDto> {
    let imageUrl = dto.bike.image_url;
    if (imageUrl && !imageUrl.includes(process.env.CLOUDFARE_PUBLIC_URL!)) {
      imageUrl = await this.storeFileFromUrl(imageUrl);
    }

    const bikeToSave: CreateBikeDto = { ...dto.bike, image_url: imageUrl };

    return await this.prisma.$transaction(async (db) => {
      const bike = await db.bikes.create({ data: { ...bikeToSave } });

      const validComponents = dto.components.filter((c) => c.component_type_id !== undefined);
      const componentData = validComponents.map((data) => ({
        ...data,
        bike_id: bike.id,
        component_type_id: data.component_type_id,
      }));

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

  async findByID(id: number): Promise<ResponseBikeDto> {
    const bike = await this.prisma.bikes.findUnique({ where: { id } });
    if (!bike) {
      throw new NotFoundException(`Bike with ID ${id} not found`);
    }
    return bike;
  }

  async update(id: number, updateBikeDto: UpdateBikeDto): Promise<ResponseBikeDto> {
    const bike = await this.prisma.bikes.findUnique({ where: { id } });
    if (!bike) {
      throw new NotFoundException(`Bike with ID ${id} not found`);
    }
    return this.prisma.bikes.update({ where: { id }, data: updateBikeDto });
  }

  async deleteSoft(id: number): Promise<ResponseBikeDto> {
    const bike = await this.prisma.bikes.findUnique({ where: { id } });
    if (!bike) {
      throw new NotFoundException(`Bike with ID ${id} not found`);
    }
    return this.prisma.bikes.update({
      where: { id },
      data: { is_deleted: true, deleted_at: new Date() },
    });
  }

  async deleteHard(id: number): Promise<ResponseBikeDto> {
    const bike = await this.prisma.bikes.findUnique({ where: { id } });
    if (!bike) {
      throw new NotFoundException(`Bike with ID ${id} not found`);
    }
    return this.prisma.bikes.delete({ where: { id } });
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
