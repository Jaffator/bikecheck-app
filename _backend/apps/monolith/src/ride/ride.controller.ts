import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RideService } from './ride.service';
import { ResponseRidePageDto } from './dto/response-ride.dto';

@Controller('rides')
export class RideController {
  constructor(private readonly rideService: RideService) {}

  // ---------- GET one page of the user's confirmed rides ----------
  @ApiOperation({ summary: "List the current user's rides, newest first" })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'offset', type: Number, required: false })
  @ApiResponse({ status: 200, type: ResponseRidePageDto })
  @Get()
  listRides(
    @CurrentUser('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ResponseRidePageDto> {
    // An absent or empty parameter must reach the service as NaN, so it falls
    // back to its own default — Number('') is 0, which would clamp to a
    // one-ride page instead.
    return this.rideService.findPage(Number(userId), toNumber(limit), toNumber(offset));
  }
}

// A query parameter the caller left out is not a number at all.
function toNumber(value?: string): number {
  return value === undefined || value === '' ? Number.NaN : Number(value);
}
