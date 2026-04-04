import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode } from '@nestjs/common';
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
// import { NewBikeFormData } from './types/bike.types';

@Controller('bike')
export class BikeController {
  constructor(
    private readonly bikeService: BikeService,
    private readonly searchBikeExternalService: BikeDataScrapeService,
  ) {}

  // Create new bike with componenets - Image external URL
  @Post('/create')
  @ApiBody({ type: CreateBikeWithComponentsDto })
  @ApiResponse({ status: 201, type: ResponseBikeDto })
  async createBike(@Body() dto: CreateBikeWithComponentsDto): Promise<ResponseBikeDto> {
    return await this.bikeService.createBikeWithComponents(dto);
  }

  // Search External Bikelist - based on name and year
  @Post('/search-external')
  @HttpCode(200)
  @ApiResponse({ status: 200, type: SearchBikeExternalResponseDto, isArray: true })
  async searchBikeExternal(@Body() dto: SearchBikeExternalRequestDto) {
    return this.searchBikeExternalService.searchBikeList(dto.bikeName, dto.year);
  }

  // Search External Bike components
  @Post('/search-external/components')
  @HttpCode(200)
  @ApiResponse({ status: 200, type: BikeComponentExternalResponseDto, isArray: true })
  async searchComponentsExternal(@Body('bikeUrl') bikeUrl: string) {
    return await this.searchBikeExternalService.externalGetBikeComponents(bikeUrl);
  }

  // Get bike form options
  @Get('/form-options')
  @ApiResponse({ status: 200 })
  async formOptions() {
    return await this.bikeService.getFormOptions();
  }

  // Get bike by ID
  @Get(':id')
  @ApiResponse({ status: 200, type: ResponseBikeDto })
  findBike(@Param('id') id: string) {
    return this.bikeService.findByID(+id);
  }

  // Update bike by ID
  @Patch(':id')
  @ApiBody({ type: UpdateBikeDto })
  @ApiResponse({ status: 200, type: ResponseBikeDto })
  update(@Param('id') id: string, @Body() updateBikeDto: UpdateBikeDto) {
    return this.bikeService.update(+id, updateBikeDto);
  }

  // Soft delete bike by ID
  @Delete('/delsoft/:id')
  @ApiResponse({ status: 200, type: ResponseBikeDto })
  deleteSoft(@Param('id') id: string) {
    return this.bikeService.deleteSoft(+id);
  }

  // Hard delete bike by ID
  @Delete('/delhard/:id')
  @ApiResponse({ status: 200, type: ResponseBikeDto })
  deleteHard(@Param('id') id: string) {
    return this.bikeService.deleteHard(+id);
  }
}
// // Create new bike with componenets - Upload image
// @Post('/create/with-image')
// @ApiBody({ type: CreateBikeWithComponentsDto })
// @ApiResponse({ status: 201, type: ResponseBikeDto })
// @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
// async create(@Body('data') data: string) {
//   const dto = JSON.parse(data) as CreateBikeWithComponentsDto;
//   return this.bikeService.createBikeWithComponents(dto);
// }
