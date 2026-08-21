import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { BikeEventService } from './bike-event.service';
import {
  Response_ActionsOnGroup_Dto,
  Response_BikeEvent_Dto,
  Response_ServiceHistory_Dto,
} from './dto/response-bike-event.dto';
import { Create_BikeEventDto } from './dto/create-bike-event.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('bike-events')
export class BikeEventController {
  constructor(private readonly bikeEventService: BikeEventService) {}

  // ---------- POST Create a new bike event ----------
  @Post('/create')
  @ApiBody({ type: Create_BikeEventDto })
  @ApiResponse({ status: 201, type: Response_BikeEvent_Dto })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: Create_BikeEventDto,
  ): Promise<Response_BikeEvent_Dto> {
    return this.bikeEventService.create(dto, Number(userId));
  }

  // ---------- GET All actions and mounted componenets releated to group ----------
  @Get('/group-actions')
  @ApiQuery({ name: 'groupId', type: Number })
  @ApiQuery({ name: 'bikeId', type: Number })
  @ApiResponse({ status: 200, type: Response_ActionsOnGroup_Dto })
  async getActionsOnGroup(
    @CurrentUser('userId') userId: string,
    @Query('groupId') groupId: string,
    @Query('bikeId') bikeId: string,
  ): Promise<Response_ActionsOnGroup_Dto> {
    return this.bikeEventService.actionsGroupComponents(+groupId, +bikeId, Number(userId));
  }

  // ---------- GET All Bike Events for a bike ----------
  @Get('/find-all/:bikeId')
  @ApiResponse({ status: 200, type: Response_BikeEvent_Dto, isArray: true })
  async findAllBikeEvents(
    @CurrentUser('userId') userId: string,
    @Param('bikeId') bikeId: string,
  ): Promise<Response_BikeEvent_Dto[]> {
    return this.bikeEventService.findAllBikeEvents(+bikeId, Number(userId));
  }

  // ---------- GET Service history across the caller's bikes ----------
  // Declared before ':id' so "history" is not read as an event id.
  @Get('/history')
  @ApiQuery({ name: 'bikeId', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'offset', type: Number, required: false })
  @ApiResponse({ status: 200, type: Response_ServiceHistory_Dto })
  async history(
    @CurrentUser('userId') userId: string,
    @Query('bikeId') bikeId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<Response_ServiceHistory_Dto> {
    // An absent or empty limit/offset must reach the service as NaN so it falls back to
    // its own default - Number('') is 0, which would ask for an empty page.
    return this.bikeEventService.history(
      Number(userId),
      toNumber(limit),
      toNumber(offset),
      bikeId === undefined || bikeId === '' ? undefined : Number(bikeId),
    );
  }

  // ---------- GET a single Bike Event by ID ----------
  @Get(':id')
  @ApiResponse({ status: 200, type: Response_BikeEvent_Dto })
  async findOne(@CurrentUser('userId') userId: string, @Param('id') id: string): Promise<Response_BikeEvent_Dto> {
    return this.bikeEventService.findById(+id, Number(userId));
  }

  // ---------- DELETE Soft delete a bike event ----------
  @Delete('/delsoft/:id')
  @ApiResponse({ status: 200, type: Response_BikeEvent_Dto })
  async softDelete(@CurrentUser('userId') userId: string, @Param('id') id: string): Promise<void> {
    return this.bikeEventService.softDelete(+id, Number(userId));
  }
  // ---------- DELETE Hard delete a bike event ----------
  @Delete('/delhard/:id')
  @ApiResponse({ status: 200, type: Response_BikeEvent_Dto })
  async hardDelete(@CurrentUser('userId') userId: string, @Param('id') id: string): Promise<void> {
    return this.bikeEventService.hardDelete(+id, Number(userId));
  }

  // @Patch(':id')
  // @ApiBody({ type: UpdateBikeEventDto })
  // @ApiResponse({ status: 200, type: Response_BikeEvent_Dto })
  // async update(@Param('id') id: string, @Body() dto: UpdateBikeEventDto): Promise<Response_BikeEvent_Dto> {
  //   return this.bikeEventService.update(+id, dto);
  // }
}

// A query parameter the caller left out is not a number at all.
function toNumber(value?: string): number {
  return value === undefined || value === '' ? Number.NaN : Number(value);
}
