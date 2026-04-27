import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiResponse, ApiBody } from '@nestjs/swagger';
import { BikeEventService } from './bike-event.service';
import { UpdateBikeEventDto } from './dto/update-bike-event.dto';
import { Response_ActionsOnGroup_Dto, Response_BikeEvent_Dto } from './dto/response-bike-event.dto';
import { Create_BikeEventDto } from './dto/create-bike-event.dto';

@Controller('bike-event')
export class BikeEventController {
  constructor(private readonly bikeEventService: BikeEventService) {}

  // POST Create a new bike event
  @Post('/create')
  @ApiBody({ type: Create_BikeEventDto })
  @ApiResponse({ status: 201, type: Response_BikeEvent_Dto })
  async create(@Body() dto: Create_BikeEventDto): Promise<Response_BikeEvent_Dto> {
    return this.bikeEventService.create(dto);
  }

  // GET all actions and mounted componenets releated to group of componenets
  @Get('/actions-on-group')
  @ApiResponse({ status: 200, type: Response_ActionsOnGroup_Dto })
  async getActionsOnGroup(
    @Query('groupId') groupId: string,
    @Query('bikeId') bikeId: string,
  ): Promise<Response_ActionsOnGroup_Dto> {
    return this.bikeEventService.actionsGroupComponents(+groupId, +bikeId);
  }

  // @Get(':id')
  // @ApiResponse({ status: 200, type: Response_BikeEvent_Dto })
  // async findOne(@Param('id') id: string): Promise<Response_BikeEvent_Dto> {
  //   return this.bikeEventService.findById(+id);
  // }

  // @Get('bike/:bikeId')
  // @ApiResponse({ status: 200, type: Response_BikeEvent_Dto, isArray: true })
  // async findByBikeId(@Param('bikeId') bikeId: string): Promise<Response_BikeEvent_Dto[]> {
  //   return this.bikeEventService.findByBikeId(+bikeId);
  // }

  // @Patch(':id')
  // @ApiBody({ type: UpdateBikeEventDto })
  // @ApiResponse({ status: 200, type: Response_BikeEvent_Dto })S
  // async update(@Param('id') id: string, @Body() dto: UpdateBikeEventDto): Promise<Response_BikeEvent_Dto> {
  //   return this.bikeEventService.update(+id, dto);
  // }

  // @Delete('/soft/:id')
  // @ApiResponse({ status: 200, type: Response_BikeEvent_Dto })
  // async softDelete(@Param('id') id: string): Promise<Response_BikeEvent_Dto> {
  //   return this.bikeEventService.softDelete(+id);
  // }

  // @Delete('/hard/:id')
  // @ApiResponse({ status: 200, type: Response_BikeEvent_Dto })
  // async hardDelete(@Param('id') id: string): Promise<Response_BikeEvent_Dto> {
  //   return this.bikeEventService.hardDelete(+id);
  // }
}
