import { Injectable } from '@nestjs/common';
import { CreateBikeDto } from './dto/create-bike.dto';
import { UpdateBikeDto } from './dto/update-bike.dto';
import { bikes as ResponseBikeDto } from '@prisma/client';
import { BikeRepository } from './bike.repository';

@Injectable()
export class BikeService {
  constructor(private readonly repository: BikeRepository) {}

  async create(createBikeDto: CreateBikeDto): Promise<ResponseBikeDto> {
    return await this.repository.createBike(createBikeDto);
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
