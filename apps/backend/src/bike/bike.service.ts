import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBikeDto, CreateBikeWithComponentsDto } from './dto/create-bike.dto';
import { UpdateBikeDto } from './dto/update-bike.dto';
import { ResponseBikeDto } from './dto/response-bike.dto';
import { BikeRepository } from './bike.repository';
import { ComponentRepository } from 'src/component/component.repository';
import { BIKE_IMAGES_DIR } from 'src/config/path';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';

@Injectable()
export class BikeService {
  constructor(
    private readonly bikeRepository: BikeRepository,
    private readonly componentRepository: ComponentRepository,
  ) {}

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

  // Create a new bike with components
  async createBikeWithComponents(dto: CreateBikeWithComponentsDto): Promise<ResponseBikeDto> {
    let bikeToSave: CreateBikeDto;

    // image url is external, download and save locally
    if (dto.bike.image_url?.startsWith('http')) {
      const localurl = await this.downloadImageExternalUrl(dto.bike.image_url);
      bikeToSave = {
        ...dto.bike,
        image_url: localurl,
      };
    } else {
      // image url is already local or not provided, use as is
      bikeToSave = { ...dto.bike };
    }
    const newbike = await this.bikeRepository.createBike(bikeToSave);
    const componentData = dto.components.map((data) => {
      return { ...data, bike_id: newbike.id };
    });
    await this.componentRepository.createMountedComponentMany(componentData);
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
}
