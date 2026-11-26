import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { BillingService } from './billing.service';
import { RedeemKeyDto } from './dto/redeem-key.dto';
import { ResponseBikeLimitDto } from './dto/response-bike-limit.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ---------- GET the account's bike limit ----------
  @ApiOperation({ summary: "The signed-in account's bike limit, what counts against it and since when it has Pro" })
  @ApiResponse({ status: 200, type: ResponseBikeLimitDto })
  @Get('bike-limit')
  async bikeLimit(@CurrentUser('userId') userId: string): Promise<ResponseBikeLimitDto> {
    return await this.billingService.bikeLimit(Number(userId));
  }

  // ---------- POST a Key ----------
  @ApiOperation({ summary: 'Redeem a Key for Pro; an account that has Pro gets its current state back' })
  @ApiResponse({ status: 200, type: ResponseBikeLimitDto })
  @ApiResponse({ status: 404, description: 'KEY_NOT_VALID' })
  @ApiResponse({ status: 409, description: 'KEY_USED_UP' })
  @ApiResponse({ status: 429, description: 'More than 5 attempts a minute' })
  // Per account (UserThrottlerGuard), so a key cannot be guessed.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('redeem-key')
  async redeemKey(@CurrentUser('userId') userId: string, @Body() body: RedeemKeyDto): Promise<ResponseBikeLimitDto> {
    return await this.billingService.redeemKey(Number(userId), body.code);
  }
}
