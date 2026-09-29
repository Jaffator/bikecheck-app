import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';
import { PERIODS, StatsService } from './stats.service';
import { Response_SpendDto } from './dto/response-spend';
import { Response_DistanceDto } from './dto/response-distance';
import { Response_WearForecastDto } from './dto/response-wear-forecast';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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
  @ApiResponse({ status: 200, type: Response_SpendDto })
  async getSpend(@CurrentUser('userId') userId: string, @Query('period') period?: string): Promise<Response_SpendDto> {
    return await this.statsService.getSpend(Number(userId), period);
  }

  // ---------- GET the distance each bike covered, day by day, in one Period ----------
  @Get('distance')
  @ApiQuery({
    name: 'period',
    enum: PERIODS,
    required: false,
    description: 'Omitted: this year, or last year while this one has no ride',
  })
  @ApiResponse({ status: 200, type: Response_DistanceDto })
  async getDistance(
    @CurrentUser('userId') userId: string,
    @Query('period') period?: string,
  ): Promise<Response_DistanceDto> {
    return await this.statsService.getDistance(Number(userId), period);
  }

  // ---------- GET the Tracked Actions that run out soonest, with their wear curves ----------
  @Get('wear-forecast')
  @ApiResponse({ status: 200, type: Response_WearForecastDto })
  async getWearForecast(@CurrentUser('userId') userId: string): Promise<Response_WearForecastDto> {
    return await this.statsService.getWearForecast(Number(userId));
  }
}
