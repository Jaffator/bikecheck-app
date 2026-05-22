import { Controller, Get, Query } from '@nestjs/common';
import { TokenService } from './tokens.service';

@Controller('strava')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Get('exchange_token')
  async exchangeToken(@Query('code') code: string): Promise<void> {
    await this.tokenService.exchangeToken(code);

    // next step -> Redirect to frontend with success message
    // ------ impleten redirection ------
  }
}

// Call this for Strava onboard
// http://www.strava.com/oauth/authorize?client_id=235898&response_type=code&redirect_uri=http://localhost:3002/strava/exchange_token&approval_prompt=force&scope=activity:read_all

// GET this url after authorization to exchange code for access token
// http://localhost/exchange_token?state=&code=dfce9e855ee68201045782f19a7853633ec3fcb9&scope=read,activity:read_all
