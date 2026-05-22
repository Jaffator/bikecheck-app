import { Injectable } from '@nestjs/common';
import { BikeEventRepository } from './bike-event.repository';
import { Create_BikeEventDto } from './dto/create-bike-event.dto';
import { Response_ActionsOnGroup_Dto, Response_BikeEvent_Dto } from './dto/response-bike-event.dto';

@Injectable()
export class BikeEventService {
  constructor(private readonly bikeEventRepository: BikeEventRepository) {}

  // ---------- Get all actions and mounted componenets releated to group of componenets ----------
  async actionsGroupComponents(groupId: number, bikeId: number): Promise<Response_ActionsOnGroup_Dto> {
    return this.bikeEventRepository.getActionsGroupComponents(groupId, bikeId);
  }

  // ---------- Create a new Bike Event ----------
  async create(dto: Create_BikeEventDto): Promise<Response_BikeEvent_Dto> {
    return this.bikeEventRepository.create(dto);
  }

  // ---------- Get all bike events for a bike ----------
  async findAllBikeEvents(bikeId: number): Promise<Response_BikeEvent_Dto[]> {
    return this.bikeEventRepository.findAllByBikeId(bikeId);
  }

  // ---------- Get a single bike event by ID ----------
  async findById(bikeEventId: number): Promise<Response_BikeEvent_Dto> {
    return this.bikeEventRepository.findById(bikeEventId);
  }

  // ---------- Soft delete a bike event ----------
  async softDelete(bikeEventId: number): Promise<void> {
    await this.bikeEventRepository.softDelete(bikeEventId);
  }

  // ---------- Hard delete a bike event ----------
  async hardDelete(bikeEventId: number): Promise<void> {
    await this.bikeEventRepository.hardDelete(bikeEventId);
  }
}
