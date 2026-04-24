import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiResponse, ApiBody, ApiTags } from '@nestjs/swagger';
import { BikeEventService } from './bike-event.service';
import { CreateBikeEventDto } from './dto/create-bike-event.dto';
import { UpdateBikeEventDto } from './dto/update-bike-event.dto';
import { ResponseBikeEventDto } from './dto/response-bike-event.dto';
import { ResponseActionsAndComponenetsDto } from './dto/response-bike-event.dto';
import { ActionsComponentsGroupDto } from './dto/create-bike-event.dto';

@ApiTags('Bike Events')
@Controller('bike-event')
export class BikeEventController {
  constructor(private readonly bikeEventService: BikeEventService) {}

  // Create a new bike event
  @Post('/create')
  @ApiBody({ type: CreateBikeEventDto })
  @ApiResponse({ status: 201, type: ResponseBikeEventDto })
  async create(@Body() dto: CreateBikeEventDto): Promise<ResponseBikeEventDto> {
    return this.bikeEventService.create(dto);
  }

  // Get all actions and mounted componenets releated to group of componenets
  @Get('/actions-on-group')
  @ApiResponse({ status: 200, type: ResponseActionsAndComponenetsDto })
  async getActionsOnGroup(@Query() dto: ActionsComponentsGroupDto): Promise<ResponseActionsAndComponenetsDto> {
    return this.bikeEventService.getActionsOnGroupComponents(dto);
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: ResponseBikeEventDto })
  async findOne(@Param('id') id: string): Promise<ResponseBikeEventDto> {
    return this.bikeEventService.findById(+id);
  }

  @Get('bike/:bikeId')
  @ApiResponse({ status: 200, type: ResponseBikeEventDto, isArray: true })
  async findByBikeId(@Param('bikeId') bikeId: string): Promise<ResponseBikeEventDto[]> {
    return this.bikeEventService.findByBikeId(+bikeId);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateBikeEventDto })
  @ApiResponse({ status: 200, type: ResponseBikeEventDto })
  async update(@Param('id') id: string, @Body() dto: UpdateBikeEventDto): Promise<ResponseBikeEventDto> {
    return this.bikeEventService.update(+id, dto);
  }

  @Delete('/soft/:id')
  @ApiResponse({ status: 200, type: ResponseBikeEventDto })
  async softDelete(@Param('id') id: string): Promise<ResponseBikeEventDto> {
    return this.bikeEventService.softDelete(+id);
  }

  @Delete('/hard/:id')
  @ApiResponse({ status: 200, type: ResponseBikeEventDto })
  async hardDelete(@Param('id') id: string): Promise<ResponseBikeEventDto> {
    return this.bikeEventService.hardDelete(+id);
  }
}
