import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StravaEventsService } from './strava.service';
import type { StravaGearResponse } from '@contracts/strava-gear.contract';

@Controller('strava')
export class StravaController {
  constructor(private readonly stravaEventService: StravaEventsService) {}

  // ---------- GET current Strava gear (bikes) for the user ----------
  @ApiOperation({ summary: "List the user's current Strava gear (bikes) for linking" })
  @ApiResponse({ status: 200 })
  @Get('unmatched-strava-gear')
  listUnmatchedStravaGear(@CurrentUser('userId') userId: string): Promise<StravaGearResponse> {
    return this.stravaEventService.listUnmatchedStravaGear(Number(userId));
  }
}
