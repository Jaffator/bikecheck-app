import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StravaEventsService } from './strava.service';
import { ResponseUnmatchedStravaGearDto } from './dto/response-strava-unmatched-gear.dto';
import { ResponseStravaAuthorizeUrlDto } from './dto/response-strava-authorize-url.dto';
import { LinkStravaGearDto } from './dto/link-strava-gear.dto';
import { ResponsePendingStravaDto } from './dto/response-pending-strava.dto';
import { ResolvePendingActivityDto } from './dto/resolve-pending-activity.dto';

@Controller('strava')
export class StravaController {
  constructor(private readonly stravaEventService: StravaEventsService) {}

  // ---------- GET the Strava authorize URL to start the OAuth flow ----------
  @ApiOperation({ summary: 'Build the Strava authorize URL for the current user' })
  @ApiResponse({ status: 200, type: ResponseStravaAuthorizeUrlDto })
  @Get('connect')
  connectStrava(@CurrentUser('userId') userId: string): Promise<ResponseStravaAuthorizeUrlDto> {
    return this.stravaEventService.buildAuthorizeUrl(Number(userId));
  }

  // ---------- DELETE unlink the Strava account ----------
  @ApiOperation({ summary: "Unlink the current user's Strava account" })
  @ApiResponse({ status: 200 })
  @Delete('connect')
  // Returns a body on purpose: the shared frontend client parses every 2xx as
  // JSON, and a 204 would leave it parsing nothing.
  async disconnectStrava(@CurrentUser('userId') userId: string): Promise<{ success: boolean }> {
    await this.stravaEventService.disconnect(Number(userId));
    return { success: true };
  }

  // ---------- GET strava + bikecheck gear for linking ----------
  @ApiOperation({ summary: "List the user's Strava and BikeCheck bikes for linking" })
  @ApiResponse({ status: 200, type: ResponseUnmatchedStravaGearDto })
  @Get('gear-linking')
  listUnmatchedStravaGear(@CurrentUser('userId') userId: string): Promise<ResponseUnmatchedStravaGearDto> {
    console.log('List  GEARLING STRAVA');
    return this.stravaEventService.listUnmatchedStravaGear(Number(userId));
  }

  // ---------- PATCH link a Strava bike to a BikeCheck bike ----------
  @ApiOperation({ summary: 'Link a Strava bike to a BikeCheck bike' })
  @ApiBody({ type: LinkStravaGearDto })
  @ApiResponse({ status: 200 })
  @Patch('gear-linking')
  // Returns a body on purpose: the shared frontend client parses every 2xx as
  // JSON, and an empty response would leave it parsing nothing.
  async linkStravaGear(
    @CurrentUser('userId') userId: string,
    @Body() body: LinkStravaGearDto,
  ): Promise<{ success: boolean }> {
    await this.stravaEventService.linkStravaGear(Number(userId), body.links);
    return { success: true };
  }

  // ---------- GET rides waiting to be assigned to a bike ----------
  @ApiOperation({ summary: 'List rides that arrived without a bike the app could resolve' })
  @ApiResponse({ status: 200, type: ResponsePendingStravaDto, isArray: true })
  @Get('pending-activities')
  listPendingActivities(@CurrentUser('userId') userId: string): Promise<ResponsePendingStravaDto[]> {
    return this.stravaEventService.listPendingActivities(Number(userId));
  }

  // ---------- GET one pending ride ----------
  @ApiOperation({ summary: 'Read one pending ride by its Strava activity id' })
  @ApiResponse({ status: 200, type: ResponsePendingStravaDto })
  @Get('pending-activities/:activityId')
  getPendingActivity(
    @CurrentUser('userId') userId: string,
    @Param('activityId') activityId: string,
  ): Promise<ResponsePendingStravaDto> {
    return this.stravaEventService.getPendingActivity(Number(userId), BigInt(activityId));
  }

  // ---------- POST assign a pending ride to a bike ----------
  @ApiOperation({ summary: 'Assign a pending ride to a BikeCheck bike' })
  @ApiBody({ type: ResolvePendingActivityDto })
  @ApiResponse({ status: 201 })
  @Post('pending-activities/:activityId/resolve')
  // Returns a body on purpose: the shared frontend client parses every 2xx as
  // JSON, and an empty response would leave it parsing nothing.
  async resolvePendingActivity(
    @CurrentUser('userId') userId: string,
    @Param('activityId') activityId: string,
    @Body() body: ResolvePendingActivityDto,
  ): Promise<{ success: boolean }> {
    await this.stravaEventService.resolvePendingActivities_noGear({
      userId: Number(userId),
      activityId: BigInt(activityId),
      bikeId: body.bikeId,
      gearId: null,
    });
    return { success: true };
  }
}
