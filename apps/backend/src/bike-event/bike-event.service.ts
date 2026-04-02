import { Injectable, NotFoundException } from '@nestjs/common';
import { BikeEventRepository } from './bike-event.repository';
import { CreateBikeEventDto } from './dto/create-bike-event.dto';
import { UpdateBikeEventDto } from './dto/update-bike-event.dto';
import { ResponseBikeEventDto } from './dto/response-bike-event.dto';

@Injectable()
export class BikeEventService {
  constructor(private readonly bikeEventRepository: BikeEventRepository) {}

  async create(dto: CreateBikeEventDto): Promise<ResponseBikeEventDto> {
    return this.bikeEventRepository.create(dto);
  }

  async findAll(): Promise<ResponseBikeEventDto[]> {
    return this.bikeEventRepository.findAll();
  }

  async findById(id: number): Promise<ResponseBikeEventDto> {
    const event = await this.bikeEventRepository.findById(id);
    if (!event) {
      throw new NotFoundException(`Bike event with ID ${id} not found`);
    }
    return event;
  }

  async findByBikeId(bikeId: number): Promise<ResponseBikeEventDto[]> {
    return this.bikeEventRepository.findByBikeId(bikeId);
  }

  async update(id: number, dto: UpdateBikeEventDto): Promise<ResponseBikeEventDto> {
    await this.findById(id);
    return this.bikeEventRepository.update(id, dto);
  }

  async softDelete(id: number): Promise<ResponseBikeEventDto> {
    await this.findById(id);
    return this.bikeEventRepository.softDelete(id);
  }

  async hardDelete(id: number): Promise<ResponseBikeEventDto> {
    await this.findById(id);
    return this.bikeEventRepository.hardDelete(id);
  }
}
