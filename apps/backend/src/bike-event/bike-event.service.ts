import { Injectable, NotFoundException } from '@nestjs/common';
import { BikeEventRepository } from './bike-event.repository';
import { Create_BikeEventDto } from './dto/create-bike-event.dto';
import { UpdateBikeEventDto } from './dto/update-bike-event.dto';
import { Response_ActionsOnGroup_Dto, Response_BikeEvent_Dto } from './dto/response-bike-event.dto';

@Injectable()
export class BikeEventService {
  constructor(private readonly bikeEventRepository: BikeEventRepository) {}

  // Get all actions and mounted componenets releated to group of componenets
  async actionsGroupComponents(groupId: number, bikeId: number): Promise<Response_ActionsOnGroup_Dto> {
    return this.bikeEventRepository.getActionsGroupComponents(groupId, bikeId);
  }

  // Create a new bike event (with actions, attachments and replaced components)
  async create(dto: Create_BikeEventDto): Promise<Response_BikeEvent_Dto> {
    return this.bikeEventRepository.create(dto);
  }

  async findAllBikeEvents(bikeId: number): Promise<Response_BikeEvent_Dto[]> {
    return this.bikeEventRepository.findAllByBikeId(bikeId);
  }

  async softDelete(bikeEventId: number): Promise<void> {
    await this.bikeEventRepository.softDelete(bikeEventId);
  }

  async hardDelete(bikeEventId: number): Promise<void> {
    await this.bikeEventRepository.hardDelete(bikeEventId);
  }

  // async findAll(): Promise<Response_BikeEvent_Dto[]> {
  //   return this.bikeEventRepository.findAll();
  // }

  // async update(id: number, dto: UpdateBikeEventDto): Promise<Response_BikeEvent_Dto> {
  //   await this.findById(id);
  //   return this.bikeEventRepository.update(id, dto);
  // }

  // async softDelete(id: number): Promise<Response_BikeEvent_Dto> {
  //   await this.findById(id);
  //   return this.bikeEventRepository.softDelete(id);
  // }

  // async hardDelete(id: number): Promise<Response_BikeEvent_Dto> {
  //   await this.findById(id);
  //   return this.bikeEventRepository.hardDelete(id);
  // }

  // private async findById(id: number): Promise<Response_BikeEvent_Dto> {
  //   const event = await this.bikeEventRepository.findById(id);
  //   if (!event) {
  //     throw new NotFoundException(`Bike event with ID ${id} not found`);
  //   }
  //   return event;
  // }
}
