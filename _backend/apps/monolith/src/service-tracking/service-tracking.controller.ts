import { Body, Controller, Get, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ServiceTrackingService } from './service-tracking.service';
import { Response_TrackedActionDto } from './dto/response-tracked-action';
import { Response_GarageTrackedActionDto } from './dto/response-garage-tracked-action';
import { SetTrackedActionIntervalDto } from './dto/set-tracked-action-interval';
import { SetTrackedActionNotifyDto } from './dto/set-tracked-action-notify';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// A pass-through: what a caller may read, and what a reading says, is decided in
// ServiceTrackingService and nowhere else.
@Controller('service-tracking')
export class ServiceTrackingController {
  constructor(private readonly serviceTrackingService: ServiceTrackingService) {}

  // ---------- GET every Tracked Action on one bike, worst first ----------
  @Get('tracked-actions')
  @ApiResponse({ status: 200, type: Response_TrackedActionDto, isArray: true })
  async getBikeTrackedActions(
    @CurrentUser('userId') userId: string,
    @Query('bikeId', ParseIntPipe) bikeId: number,
  ): Promise<Response_TrackedActionDto[]> {
    return await this.serviceTrackingService.getBikeTrackedActions(bikeId, Number(userId));
  }

  // ---------- GET everything across the garage at or above a percentage ----------
  // The cutoff is the caller's; the dashboard asks for 80, which is where a reading starts
  // being worth showing.
  @Get('attention')
  @ApiResponse({ status: 200, type: Response_GarageTrackedActionDto, isArray: true })
  async getGarageTrackedActions(
    @CurrentUser('userId') userId: string,
    @Query('minPercentage', ParseIntPipe) minPercentage: number,
  ): Promise<Response_GarageTrackedActionDto[]> {
    return await this.serviceTrackingService.getGarageTrackedActions(Number(userId), minPercentage);
  }

  // ---------- POST the owner's own Service Interval for one Tracked Action ----------
  // Null clears it, which puts the bike's plan back. Answers with the reading as it now
  // stands, so the drawer needs no refetch to show what the change did.
  @Post('interval')
  @ApiResponse({ status: 201, type: Response_TrackedActionDto })
  async setTrackedActionInterval(
    @CurrentUser('userId') userId: string,
    @Body() dto: SetTrackedActionIntervalDto,
  ): Promise<Response_TrackedActionDto> {
    return await this.serviceTrackingService.setTrackedActionInterval(
      dto.component_mounted_id,
      dto.event_action_id,
      Number(userId),
      dto.interval_override,
    );
  }

  // ---------- POST whether one Tracked Action may announce itself ----------
  @Post('notify')
  @ApiResponse({ status: 201, type: Response_TrackedActionDto })
  async setTrackedActionNotify(
    @CurrentUser('userId') userId: string,
    @Body() dto: SetTrackedActionNotifyDto,
  ): Promise<Response_TrackedActionDto> {
    return await this.serviceTrackingService.setTrackedActionNotify(
      dto.component_mounted_id,
      dto.event_action_id,
      Number(userId),
      dto.notify,
    );
  }
}
