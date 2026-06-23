import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StravaEventsService } from './strava.service';
import { ResponseUnmatchedStravaGearDto } from './dto/response-strava-unmatched-gear.dto';
import { LinkStravaGearDto } from './dto/link-strava-gear.dto';

@Controller('strava')
export class StravaController {
  constructor(private readonly stravaEventService: StravaEventsService) {}

  // ---------- GET strava + bikecheck gear for linking ----------
  @ApiOperation({ summary: "List the user's Strava and BikeCheck bikes for linking" })
  @ApiResponse({ status: 200, type: ResponseUnmatchedStravaGearDto })
  @Get('gear-linking')
  listUnmatchedStravaGear(@CurrentUser('userId') userId: string): Promise<ResponseUnmatchedStravaGearDto> {
    return this.stravaEventService.listUnmatchedStravaGear(Number(userId));
  }

  // ---------- PATCH link a Strava bike to a BikeCheck bike ----------
  @ApiOperation({ summary: 'Link a Strava bike to a BikeCheck bike' })
  @ApiBody({ type: LinkStravaGearDto })
  @ApiResponse({ status: 200 })
  @Patch('gear-linking')
  linkStravaGear(@CurrentUser('userId') userId: string, @Body() body: LinkStravaGearDto): Promise<void> {
    return this.stravaEventService.linkStravaGear(Number(userId), body.links);
  }
}
