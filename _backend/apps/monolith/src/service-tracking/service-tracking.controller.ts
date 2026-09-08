import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ServiceTrackingService } from './service-tracking.service';
import { Response_TrackedActionDto } from './dto/response-service-tracking';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// A pass-through: which bike a caller may read, and what its Tracked Actions come out as,
// is decided in ServiceTrackingService and nowhere else.
@Controller('service-tracking')
export class ServiceTrackingController {
  constructor(private readonly serviceTrackingService: ServiceTrackingService) {}

  // ---------- GET every Tracked Action of one bike, worst first ----------
  @Get('bike/:bikeId')
  @ApiResponse({ status: 200, type: Response_TrackedActionDto, isArray: true })
  async getBikeTrackedActions(
    @CurrentUser('userId') userId: string,
    @Param('bikeId', ParseIntPipe) bikeId: number,
  ): Promise<Response_TrackedActionDto[]> {
    return await this.serviceTrackingService.getBikeTrackedActions(bikeId, Number(userId));
  }
}
