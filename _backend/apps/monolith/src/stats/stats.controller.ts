import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';
import { PERIODS, StatsService, type StatsPeriodQuery } from './stats.service';
import { Response_SpendDto } from './dto/response-spend';
import { Response_DistanceDto } from './dto/response-distance';
import { Response_EarliestDayDto } from './dto/response-earliest-day';
import { Response_WearForecastDto } from './dto/response-wear-forecast';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

const FROM_DAY = { name: 'from', required: false, description: 'First day, YYYY-MM-DD; needs `to`, refuses `period`' };
const TO_DAY = { name: 'to', required: false, description: 'Last day, YYYY-MM-DD; needs `from`, refuses `period`' };

// A pass-through: what each chart counts, and which Periods exist, is decided in StatsService.
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  // ---------- GET where the money went in one Period ----------
  @Get('spend')
  @ApiQuery({
    name: 'period',
    enum: PERIODS,
    required: false,
    description: 'Omitted: this year, or last year while this one has nothing priced',
  })
  @ApiQuery(FROM_DAY)
  @ApiQuery(TO_DAY)
  @ApiResponse({ status: 200, type: Response_SpendDto })
  async getSpend(
    @CurrentUser('userId') userId: string,
    @Query() { period, from, to }: StatsPeriodQuery,
  ): Promise<Response_SpendDto> {
    return await this.statsService.getSpend(Number(userId), period, { from, to });
  }

  // ---------- GET the distance each bike covered, day by day, in one Period ----------
  @Get('distance')
  @ApiQuery({
    name: 'period',
    enum: PERIODS,
    required: false,
    description: 'Omitted: this year, or last year while this one has no ride',
  })
  @ApiQuery(FROM_DAY)
  @ApiQuery(TO_DAY)
  @ApiResponse({ status: 200, type: Response_DistanceDto })
  async getDistance(
    @CurrentUser('userId') userId: string,
    @Query() { period, from, to }: StatsPeriodQuery,
  ): Promise<Response_DistanceDto> {
    return await this.statsService.getDistance(Number(userId), period, { from, to });
  }

  // ---------- GET the first day this garage has anything to read ----------
  @Get('earliest-day')
  @ApiResponse({ status: 200, type: Response_EarliestDayDto })
  async getEarliestDay(@CurrentUser('userId') userId: string): Promise<Response_EarliestDayDto> {
    return await this.statsService.getEarliestDay(Number(userId));
  }

  // ---------- GET every Tracked Action, soonest to run out first, with its wear curve ----------
  @Get('wear-forecast')
  @ApiResponse({ status: 200, type: Response_WearForecastDto })
  async getWearForecast(@CurrentUser('userId') userId: string): Promise<Response_WearForecastDto> {
    return await this.statsService.getWearForecast(Number(userId));
  }
}
