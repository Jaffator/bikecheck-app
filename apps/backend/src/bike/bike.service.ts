/* eslint-disable @typescript-eslint/no-unsafe-call */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBikeDto, CreateBikeWithComponentsDto } from './dto/create-bike.dto';
import { UpdateBikeDto } from './dto/update-bike.dto';
import { ResponseBikeDto } from './dto/response-bike.dto';
import { BikeRepository } from './bike.repository';
import { ComponentRepository } from 'src/component/component.repository';
import { randomUUID } from 'crypto';
import { PrismaService } from 'prisma/prisma.service';
import { NewBikeFormData } from './types/bike.types';
import { StorageService } from '../storage/storage.service';
import 'dotenv/config';
import path from 'path';

@Injectable()
export class BikeService {
  constructor(
    private readonly bikeRepository: BikeRepository,
    private readonly componentRepository: ComponentRepository,
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async getFormOptions(): Promise<NewBikeFormData> {
    return await this.bikeRepository.getBikeOptions();
  }

  /**
   * Create a new bike with components
   * - If the bike's image_url is an external URL, it will be downloaded and stored locally, and the local URL will be saved in the database.
   * @returns ResponseBikeDto
   */
  async createBikeWithComponents(dto: CreateBikeWithComponentsDto): Promise<ResponseBikeDto> {
    let imageUrl = dto.bike.image_url;

    // Pokud je external URL (ne z R2), uložit do R2
    if (imageUrl && !imageUrl.includes(process.env.CLOUDFARE_PUBLIC_URL!)) {
      imageUrl = await this.storeFileFromUrl(imageUrl);
    }

    const bikeToSave: CreateBikeDto = { ...dto.bike, image_url: imageUrl };

    const newbike = await this.prisma.$transaction(async (db) => {
      const bike = await this.bikeRepository.createBike(bikeToSave, db);
      const componentData = dto.components.map((data) => ({ ...data, bike_id: bike.id }));
      await this.componentRepository.createMountedComponentMany(componentData, db);
      return bike;
    });

    return newbike;
  }

  async findAll(): Promise<ResponseBikeDto[]> {
    return await this.bikeRepository.findAll();
  }

  async findByID(id: number): Promise<ResponseBikeDto> {
    const bike = await this.bikeRepository.findById(id);
    if (!bike) {
      throw new NotFoundException(`Bike with ID ${id} not found`);
    }
    return bike;
  }

  async update(id: number, updateBikeDto: UpdateBikeDto) {
    const bike = await this.bikeRepository.findById(id);
    if (!bike) {
      throw new NotFoundException(`Bike with ID ${id} not found`);
    }
    return await this.bikeRepository.updateBike(id, updateBikeDto);
  }

  async deleteSoft(id: number): Promise<ResponseBikeDto> {
    const bike = await this.bikeRepository.findById(id);
    if (!bike) {
      throw new NotFoundException(`Bike with ID ${id} not found`);
    }
    return await this.bikeRepository.softDeleteBike(id);
  }

  async deleteHard(id: number): Promise<ResponseBikeDto> {
    const bike = await this.bikeRepository.findById(id);
    if (!bike) {
      throw new NotFoundException(`Bike with ID ${id} not found`);
    }
    return await this.bikeRepository.hardDeleteBike(id);
  }

  // Private methods
  /**
   * Downloads an external image, stores it in local public storage,
   * and returns its local public URL.
   */
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
