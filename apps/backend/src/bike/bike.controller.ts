import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { BikeService } from './bike.service';
import { BikeDataScrapeService } from './bike-data-scraper/bike-data-scraper.service';
import { CreateBikeWithComponentsDto } from './dto/create-bike.dto';
import { UpdateBikeDto } from './dto/update-bike.dto';
import { ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { SearchBikeExternalResponseDto, ResponseBikeDto, NewBikeFormDataDto } from './dto/response-bike.dto';
import { AssembleBikeComponentsDto } from '../component/dto/response-components';
// import { NewBikeFormData } from './types/bike.types';

@Controller('bike')
export class BikeController {
  constructor(
    private readonly bikeService: BikeService,
    private readonly searchBikeExternalService: BikeDataScrapeService,
  ) {}

  // ---------- POST Create new bike with componenets - Image external URL ----------
  @Post('/create')
  @ApiBody({ type: CreateBikeWithComponentsDto })
  @ApiResponse({ status: 201, type: ResponseBikeDto })
  async createBike(@Body() dto: CreateBikeWithComponentsDto): Promise<ResponseBikeDto> {
    return await this.bikeService.createBikeWithComponents(dto);
  }

  // ---------- GET External Bike List ----------
  @Get('/external')
  @ApiResponse({ status: 200, type: SearchBikeExternalResponseDto, isArray: true })
  @ApiQuery({ name: 'bikeName', type: String })
  @ApiQuery({ name: 'year', type: String })
  async searchBikeExternal(
    @Query('bikeName') bikeName: string,
    @Query('year') year: string,
  ): Promise<SearchBikeExternalResponseDto[]> {
    return this.searchBikeExternalService.searchBikeList(bikeName, year);
  }

  // ---------- GET Search External Bike components ----------
  @Get('/external/components')
  @ApiResponse({ status: 200, type: AssembleBikeComponentsDto, isArray: true })
  @ApiQuery({ name: 'bikeUrl', type: String })
  async searchComponentsExternal(@Query('bikeUrl') bikeUrl: string): Promise<AssembleBikeComponentsDto[]> {
    return await this.searchBikeExternalService.externalGetBikeComponents(bikeUrl);
  }

  // ---------- GET bike form options ----------
  @Get('/form-options')
  @ApiResponse({ status: 200, type: NewBikeFormDataDto })
  async formOptions(): Promise<NewBikeFormDataDto> {
    return await this.bikeService.getFormOptions();
  }

  // ---------- GET bike by ID ----------
  @Get(':id')
  @ApiResponse({ status: 200, type: ResponseBikeDto })
  findBike(@Param('id') id: string) {
    return this.bikeService.findByID(+id);
  }

  // ---------- UPDATE bike by ID ----------
  @Patch(':id')
  @ApiBody({ type: UpdateBikeDto })
  @ApiResponse({ status: 200, type: ResponseBikeDto })
  update(@Param('id') id: string, @Body() updateBikeDto: UpdateBikeDto) {
    return this.bikeService.update(+id, updateBikeDto);
  }

  // ---------- DELETE soft bike by ID ----------
  @Delete('/delsoft/:id')
  @ApiResponse({ status: 200, type: ResponseBikeDto })
  deleteSoft(@Param('id') id: string) {
    return this.bikeService.deleteSoft(+id);
  }

  // ---------- DELETE hard bike by ID ----------
  @Delete('/delhard/:id')
  @ApiResponse({ status: 200, type: ResponseBikeDto })
  deleteHard(@Param('id') id: string) {
    return this.bikeService.deleteHard(+id);
  }
}
// // ---------- Create new bike with componenets - Upload image ----------
// @Post('/create/with-image')
// @ApiBody({ type: CreateBikeWithComponentsDto })
// @ApiResponse({ status: 201, type: ResponseBikeDto })
// @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
// async create(@Body('data') data: string) {
//   const dto = JSON.parse(data) as CreateBikeWithComponentsDto;
//   return this.bikeService.createBikeWithComponents(dto);
// }
