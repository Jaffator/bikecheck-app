import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  UploadedFile,
  ValidationPipe,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BikeService } from './bike.service';
import { BikeDataScrapeService } from './bike-data-scraper/bike-data-scraper.service';
import { CreateBikeWithComponentsDto } from './dto/create-bike.dto';
import { UpdateBikeDto } from './dto/update-bike.dto';
import { ApiResponse, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { SearchBikeExternalRequestDto } from './dto/create-bike.dto';
import {
  SearchBikeExternalResponseDto,
  BikeComponentExternalResponseDto,
  ResponseBikeDto,
} from './dto/response-bike.dto';
import { memoryStorage } from 'multer';
import { ParseJsonPipe } from 'src/_pipes/parse-json.pipe';

@Controller('bike')
export class BikeController {
  constructor(
    private readonly bikeService: BikeService,
    private readonly searchBikeExternalService: BikeDataScrapeService,
  ) {}

  // Create new bike with componenets - image external URL
  @Post('/create')
  @ApiBody({ type: CreateBikeWithComponentsDto })
  @ApiResponse({ status: 201, type: ResponseBikeDto })
  async create(@Body() dto: CreateBikeWithComponentsDto) {
    return this.bikeService.createBikeWithComponents(dto);
  }

  // Create new bike with componenets - Upload image
  @Post('/create/with-image')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateBikeWithComponentsDto })
  @ApiResponse({ status: 201, type: ResponseBikeDto })
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  async createWithImage(@UploadedFile() image: Express.Multer.File, @Body('data') data: string) {
    const dto = JSON.parse(data) as CreateBikeWithComponentsDto;
    console.log(image);
    return this.bikeService.createBikeWithComponents(dto, image);
  }

  // Search External bikelist
  @Post('/search-external')
  @HttpCode(200)
  @ApiResponse({ status: 200, type: SearchBikeExternalResponseDto, isArray: true })
  async findBike(@Body() dto: SearchBikeExternalRequestDto) {
    return this.searchBikeExternalService.searchBikeList(dto.bikeName, dto.year);
  }

  // Search External bike components by bike URL
  @Post('/search-external/components')
  @HttpCode(200)
  @ApiResponse({ status: 200, type: BikeComponentExternalResponseDto, isArray: true })
  async findBikeComponents(@Body('bikeUrl') bikeUrl: string) {
    return this.searchBikeExternalService.getBikeComponents(bikeUrl);
  }

  // Get bike by ID
  @Get(':id')
  @ApiResponse({ status: 200, type: ResponseBikeDto })
  findOne(@Param('id') id: string) {
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
