import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { BikeEventService } from './bike-event.service';
import { Response_ActionsOnGroup_Dto, Response_BikeEvent_Dto } from './dto/response-bike-event.dto';
import { Create_BikeEventDto } from './dto/create-bike-event.dto';

@Controller('bike-events')
export class BikeEventController {
  constructor(private readonly bikeEventService: BikeEventService) {}

  // ---------- POST Create a new bike event ----------
  @Post('/create')
  @ApiBody({ type: Create_BikeEventDto })
  @ApiResponse({ status: 201, type: Response_BikeEvent_Dto })
  async create(@Body() dto: Create_BikeEventDto): Promise<Response_BikeEvent_Dto> {
    return this.bikeEventService.create(dto);
  }

  // ---------- GET All actions and mounted componenets releated to group ----------
  @Get('/group-actions')
  @ApiQuery({ name: 'groupId', type: Number })
  @ApiQuery({ name: 'bikeId', type: Number })
  @ApiResponse({ status: 200, type: Response_ActionsOnGroup_Dto })
  async getActionsOnGroup(
    @Query('groupId') groupId: string,
    @Query('bikeId') bikeId: string,
  ): Promise<Response_ActionsOnGroup_Dto> {
    return this.bikeEventService.actionsGroupComponents(+groupId, +bikeId);
  }

  // ---------- GET All Bike Events for a bike ----------
  @Get('/find-all/:bikeId')
  @ApiResponse({ status: 200, type: Response_BikeEvent_Dto, isArray: true })
  async findAllBikeEvents(@Param('bikeId') bikeId: string): Promise<Response_BikeEvent_Dto[]> {
    return this.bikeEventService.findAllBikeEvents(+bikeId);
  }

  // ---------- GET a single Bike Event by ID ----------
  @Get(':id')
  @ApiResponse({ status: 200, type: Response_BikeEvent_Dto })
  async findOne(@Param('id') id: string): Promise<Response_BikeEvent_Dto> {
    return this.bikeEventService.findById(+id);
  }

  // ---------- DELETE Soft delete a bike event ----------
  @Delete('/delsoft/:id')
  @ApiResponse({ status: 200, type: Response_BikeEvent_Dto })
  async softDelete(@Param('id') id: string): Promise<void> {
    return this.bikeEventService.softDelete(+id);
  }
  // ---------- DELETE Hard delete a bike event ----------
  @Delete('/delhard/:id')
  @ApiResponse({ status: 200, type: Response_BikeEvent_Dto })
  async hardDelete(@Param('id') id: string): Promise<void> {
    return this.bikeEventService.hardDelete(+id);
  }

  // @Patch(':id')
  // @ApiBody({ type: UpdateBikeEventDto })
  // @ApiResponse({ status: 200, type: Response_BikeEvent_Dto })
  // async update(@Param('id') id: string, @Body() dto: UpdateBikeEventDto): Promise<Response_BikeEvent_Dto> {
  //   return this.bikeEventService.update(+id, dto);
  // }
}
