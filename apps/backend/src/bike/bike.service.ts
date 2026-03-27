import { Injectable } from '@nestjs/common';
import { CreateBikeDto } from './dto/create-bike.dto';
import { UpdateBikeDto } from './dto/update-bike.dto';
import { ResponseBikeDto } from './dto/response-bike.dto';
import { BikeRepository } from './bike.repository';
import { ComponentRepository } from 'src/component/component.repository';
import { CreateComponentsDto } from 'src/component/dto/create-components';
import { BIKE_IMAGES_DIR } from 'src/config/path';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';

@Injectable()
export class BikeService {
  constructor(
    private readonly repository: BikeRepository,
    private readonly componentRepository: ComponentRepository,
  ) {}

  /**
   * Downloads an external image, stores it in local public storage,
   * and returns its local public URL.
   */
  private async downloadImageExternalUrl(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const image = await response.arrayBuffer();
    const filename = `${randomUUID()}.jpg`;
    const filepath = path.join(BIKE_IMAGES_DIR, filename);
    await fs.writeFile(filepath, Buffer.from(image));

    return `/images/bikes/${filename}`;
  }

  // Create a new bike with components
  async create(bikeData: CreateBikeDto, componenetData: ): Promise<ResponseBikeDto> {
    let bikeToSave: CreateBikeDto;
    // image url is extrnal, download and save locally
    if (bikeData.image_url?.startsWith('http')) {
      const localurl = await this.downloadImageExternalUrl(bikeData.image_url);
      bikeToSave = {
        ...bikeData,
        image_url: localurl,
      };
    } else {
      // image url is already local or not provided, use as is
      bikeToSave = { ...bikeData };
      const newbike = await this.repository.createBike(bikeToSave);
      const newComponents = await this.componentRepository.createMountedMany(bikeComponents, newbike.id);
      return newbike;
    }
  }

  async findAll(): Promise<ResponseBikeDto[]> {
    return await this.repository.findAll();
  }

  async findByID(id: number): Promise<ResponseBikeDto | null> {
    return await this.repository.findById(id);
  }

  async update(id: number, updateBikeDto: UpdateBikeDto) {
    return await this.repository.updateBike(id, updateBikeDto);
  }

  async deleteSoft(id: number): Promise<ResponseBikeDto> {
    return await this.repository.softDeleteBike(id);
  }

  async deleteHard(id: number): Promise<ResponseBikeDto> {
    return await this.repository.hardDeleteBike(id);
  }
}
