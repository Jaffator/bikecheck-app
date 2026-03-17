import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BikeService } from './bike.service';
import { CreateBikeDto } from './dto/create-bike.dto';
import { UpdateBikeDto } from './dto/update-bike.dto';
import { ApiResponse } from '@nestjs/swagger/dist/decorators/api-response.decorator';
import { ResponseBikeDto } from './dto/response-bike.dto';

@Controller('bike')
export class BikeController {
  constructor(private readonly bikeService: BikeService) {}

  @ApiResponse({ status: 201, type: ResponseBikeDto })
  @Post()
  async create(@Body() createBikeDto: CreateBikeDto) {
    return await this.bikeService.create(createBikeDto);
  }

  @ApiResponse({ status: 200, type: ResponseBikeDto, isArray: true })
  @Get('/all')
  findAll() {
    return this.bikeService.findAll();
  }

  @ApiResponse({ status: 200, type: ResponseBikeDto })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bikeService.findByID(+id);
  }

  @ApiResponse({ status: 200, type: ResponseBikeDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBikeDto: UpdateBikeDto) {
    return this.bikeService.update(+id, updateBikeDto);
  }

  @ApiResponse({ status: 200, type: ResponseBikeDto })
  @Delete('/delsoft/:id')
  deleteSoft(@Param('id') id: string) {
    return this.bikeService.deleteSoft(+id);
  }

  @ApiResponse({ status: 200, type: ResponseBikeDto })
  @Delete('/delhard/:id')
  deleteHard(@Param('id') id: string) {
    return this.bikeService.deleteHard(+id);
  }
}
