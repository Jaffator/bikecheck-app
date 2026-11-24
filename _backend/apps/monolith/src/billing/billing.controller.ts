import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { ResponseBikeLimitDto } from './dto/response-bike-limit.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ---------- GET the account's bike limit ----------
  @ApiOperation({ summary: "The signed-in account's bike limit and what counts against it" })
  @ApiResponse({ status: 200, type: ResponseBikeLimitDto })
  @Get('bike-limit')
  async bikeLimit(@CurrentUser('userId') userId: string): Promise<ResponseBikeLimitDto> {
    return await this.billingService.bikeLimit(Number(userId));
  }
}
