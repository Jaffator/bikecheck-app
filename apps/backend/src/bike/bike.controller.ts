import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BikeService } from './bike.service';
import { BikeDataScrapeService } from './bike-data-scraper/bike-data-scraper.service';
import { CreateBikeWithComponentsDto } from './dto/create-bike.dto';
import { UpdateBikeDto } from './dto/update-bike.dto';
import { ApiResponse, ApiBody } from '@nestjs/swagger';
import { SearchBikeExternalRequestDto } from './dto/create-bike.dto';
import {
  SearchBikeExternalResponseDto,
  BikeComponentExternalResponseDto,
  ResponseBikeDto,
} from './dto/response-bike.dto';

@Controller('bike')
export class BikeController {
  constructor(
    private readonly bikeService: BikeService,
    private readonly searchBikeExternalService: BikeDataScrapeService,
  ) {}

  // Create new bike with componenets
  @ApiBody({ type: CreateBikeWithComponentsDto })
  @ApiResponse({ status: 201, type: ResponseBikeDto })
  @Post('/create')
  async create(@Body() dto: CreateBikeWithComponentsDto) {
    return this.bikeService.createBikeWithComponents(dto);
  }

  // Search External bikelist
  @Post('/search-external')
  @ApiResponse({ status: 200, type: SearchBikeExternalResponseDto, isArray: true })
  async findBike(@Body() dto: SearchBikeExternalRequestDto) {
    return this.searchBikeExternalService.searchBikeList(dto.bikeName, dto.year);
  }

  // Search External bike components by bike URL
  @Post('/search-external/components')
  @ApiResponse({ status: 200, type: BikeComponentExternalResponseDto, isArray: true })
  async findBikeComponents(@Body('bikeUrl') bikeUrl: string) {
    return this.searchBikeExternalService.getBikeComponents(bikeUrl);
  }

  // Get bike by ID
  @ApiResponse({ status: 200, type: ResponseBikeDto })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bikeService.findByID(+id);
  }

  // Update bike by ID
  @ApiBody({ type: UpdateBikeDto })
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
