import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ServiceTrackingService } from './service-tracking.service';
import { Response_TrackedActionDto } from './dto/response-tracked-action';
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
}
