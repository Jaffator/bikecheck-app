import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BikeService } from './bike.service';
import { CreateBikeWithComponentsDto } from './dto/create-bike.dto';
import { CreateBikeDto } from './dto/create-bike.dto';
import { CreateComponentsDto } from 'src/component/dto/create-components';
import { UpdateBikeDto } from './dto/update-bike.dto';
import { ApiResponse } from '@nestjs/swagger/dist/decorators/api-response.decorator';
import { ResponseBikeDto } from './dto/response-bike.dto';

@Controller('bike')
export class BikeController {
  constructor(private readonly bikeService: BikeService) {}

  // Create new bike with componenets
  @ApiResponse({ status: 201, type: ResponseBikeDto })
  @Post()
  async create(@Body() dto: CreateBikeWithComponentsDto) {
    return this.bikeService.createBikeWithComponents(dto);
  }

  // Get all bikes
  @ApiResponse({ status: 200, type: ResponseBikeDto, isArray: true })
  @Get('/all')
  findAll() {
    return this.bikeService.findAll();
  }

  // Get bike by ID
  @ApiResponse({ status: 200, type: ResponseBikeDto })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bikeService.findByID(+id);
  }

  // Update bike by ID
  @ApiResponse({ status: 200, type: ResponseBikeDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBikeDto: UpdateBikeDto) {
    return this.bikeService.update(+id, updateBikeDto);
  }

  // Soft delete bike by ID
  @ApiResponse({ status: 200, type: ResponseBikeDto })
  @Delete('/delsoft/:id')
  deleteSoft(@Param('id') id: string) {
    return this.bikeService.deleteSoft(+id);
  }

  // Hard delete bike by ID
  @ApiResponse({ status: 200, type: ResponseBikeDto })
  @Delete('/delhard/:id')
  deleteHard(@Param('id') id: string) {
    return this.bikeService.deleteHard(+id);
  }
}
