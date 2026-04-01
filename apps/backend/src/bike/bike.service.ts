import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBikeDto, CreateBikeWithComponentsDto } from './dto/create-bike.dto';
import { UpdateBikeDto } from './dto/update-bike.dto';
import { ResponseBikeDto } from './dto/response-bike.dto';
import { BikeRepository } from './bike.repository';
import { ComponentRepository } from 'src/component/component.repository';
import { BIKE_IMAGES_DIR } from 'src/_config/path';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { PrismaService } from 'prisma/prisma.service';
import type { Express } from 'express';

@Injectable()
export class BikeService {
  constructor(
    private readonly bikeRepository: BikeRepository,
    private readonly componentRepository: ComponentRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a new bike with components
   * - If the bike's image_url is an external URL, it will be downloaded and stored locally, and the local URL will be saved in the database.
   * @returns ResponseBikeDto
   */
  async createBikeWithComponents(
    dto: CreateBikeWithComponentsDto,
    imageFile?: Express.Multer.File,
  ): Promise<ResponseBikeDto> {
    let bikeToSave: CreateBikeDto;

    if (imageFile) {
      const filename = `${randomUUID()}.jpg`;
      const filepath = path.join(BIKE_IMAGES_DIR, filename);
      console.log('image file path', filepath);
      await fs.writeFile(filepath, imageFile.buffer);
      bikeToSave = { ...dto.bike, image_url: `public/images/bikes/${filename}` };
    } else if (dto.bike.image_url?.startsWith('http')) {
      const localurl = await this.downloadImageExternalUrl(dto.bike.image_url);
      bikeToSave = { ...dto.bike, image_url: localurl };
    } else {
      bikeToSave = { ...dto.bike };
    }

    const newbike = await this.prisma.$transaction(async (db) => {
      const bike = await this.bikeRepository.createBike(bikeToSave, db);
      const componentData = dto.components.map((data) => {
        return { ...data, bike_id: bike.id };
      });
      await this.componentRepository.createMountedComponentMany(componentData, db);
      return bike;
    });
    return newbike;
  }

  async findAll(): Promise<ResponseBikeDto[]> {
    return await this.bikeRepository.findAll();
  }

  async findByID(id: number): Promise<ResponseBikeDto | null> {
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
  private async downloadImageExternalUrl(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new BadRequestException(`Failed to download image: ${response.statusText}`);
    }
    try {
      const image = await response.arrayBuffer();
      const filename = `${randomUUID()}.jpg`;
      const filepath = path.join(BIKE_IMAGES_DIR, filename);
      await fs.writeFile(filepath, Buffer.from(image));

      return `/images/bikes/${filename}`;
    } catch (error) {
      throw new BadRequestException(`Failed to save image: ${error.message}`);
    }
  }
}
