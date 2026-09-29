import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RideService } from './ride.service';
import { ResponseRideCheckInDto, ResponseRideDto, ResponseRidePageDto } from './dto/response-ride.dto';
import { SaveRideCheckInDto } from './dto/save-ride-check-in.dto';

@Controller('rides')
export class RideController {
  constructor(private readonly rideService: RideService) {}

  // ---------- GET the rides the check-in drawer offers ----------
  @ApiOperation({ summary: 'Recent rides without a check-in; empty unless a ride arrived since the last drawer' })
  @ApiResponse({ status: 200, type: [ResponseRideDto] })
  @Get('check-in-prompt')
  findCheckInPrompt(@CurrentUser('userId') userId: string): Promise<ResponseRideDto[]> {
    return this.rideService.findCheckInPrompt(Number(userId));
  }

  // ---------- POST the check-in drawer has opened ----------
  @ApiOperation({ summary: 'Mark the check-in drawer as shown now' })
  @ApiResponse({ status: 200 })
  @Post('check-in-prompt/seen')
  @HttpCode(HttpStatus.OK)
  // Returns a body on purpose: the shared frontend client parses every 2xx as JSON.
  async markCheckInPromptSeen(@CurrentUser('userId') userId: string): Promise<{ success: boolean }> {
    await this.rideService.markCheckInPromptSeen(Number(userId));
    return { success: true };
  }

  // ---------- PUT a ride's check-in ----------
  @ApiOperation({ summary: 'Save how the bike rode on one of the user rides' })
  @ApiBody({ type: SaveRideCheckInDto })
  @ApiResponse({ status: 200, type: ResponseRideCheckInDto })
  @Put(':id/check-in')
  saveCheckIn(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SaveRideCheckInDto,
  ): Promise<ResponseRideCheckInDto> {
    return this.rideService.saveCheckIn(Number(userId), id, body);
  }

  // ---------- DELETE a ride's check-in ----------
  @ApiOperation({ summary: 'Remove the check-in from one of the user rides' })
  @ApiResponse({ status: 200 })
  @Delete(':id/check-in')
  async deleteCheckIn(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ success: boolean }> {
    await this.rideService.deleteCheckIn(Number(userId), id);
    return { success: true };
  }

  // ---------- GET one page of the user's confirmed rides ----------
  @ApiOperation({ summary: "List the current user's rides, newest first" })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'offset', type: Number, required: false })
  @ApiQuery({ name: 'bikeId', type: Number, required: false })
  @ApiResponse({ status: 200, type: ResponseRidePageDto })
  @Get()
  listRides(
    @CurrentUser('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('bikeId') bikeId?: string,
  ): Promise<ResponseRidePageDto> {
    // An absent or empty parameter must reach the service as NaN, so it falls
    // back to its own default — Number('') is 0, which would clamp to a
    // one-ride page instead.
    const bike = toNumber(bikeId);
    return this.rideService.findPage(
      Number(userId),
      toNumber(limit),
      toNumber(offset),
      Number.isNaN(bike) ? undefined : bike,
    );
  }
}

// A query parameter the caller left out is not a number at all.
function toNumber(value?: string): number {
  return value === undefined || value === '' ? Number.NaN : Number(value);
}
