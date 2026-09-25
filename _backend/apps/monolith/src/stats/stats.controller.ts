import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { Response_SpendDto } from './dto/response-spend';
import { Response_DistanceDto } from './dto/response-distance';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// A pass-through: what each chart counts is decided in StatsService.
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  // ---------- GET where the money went in one calendar year ----------
  @Get('spend')
  @ApiQuery({
    name: 'year',
    type: Number,
    required: false,
    description: 'Omitted: this year, or last year while this one has nothing priced',
  })
  @ApiResponse({ status: 200, type: Response_SpendDto })
  async getSpend(
    @CurrentUser('userId') userId: string,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
  ): Promise<Response_SpendDto> {
    return await this.statsService.getSpend(Number(userId), year);
  }

  // ---------- GET the distance each bike covered, week by week, in one calendar year ----------
  @Get('distance')
  @ApiQuery({
    name: 'year',
    type: Number,
    required: false,
    description: 'Omitted: this year, or last year while this one has no ride',
  })
  @ApiResponse({ status: 200, type: Response_DistanceDto })
  async getDistance(
    @CurrentUser('userId') userId: string,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
  ): Promise<Response_DistanceDto> {
    return await this.statsService.getDistance(Number(userId), year);
  }
}
