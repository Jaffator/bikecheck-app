import { Body, Controller, ForbiddenException, Get, Post, Query, Res, UseGuards, ValidationPipe } from '@nestjs/common';
import type { Response } from 'express';
import { TokenService } from './tokens.service';
import { InternalAuthGuard } from '../common/internal-auth.guard';
import { CreateOAuthStateDto } from './dto/create-oauth-state.dto';
import { DisconnectAthleteDto } from './dto/disconnect-athlete.dto';

@Controller('strava')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  // ----------------------------------------------------------
  // ---------- Start the OAuth flow (called by monolith) -----
  // ----------------------------------------------------------
  // The monolith authenticates the user with its JWT guard and forwards only the
  // user id, so this endpoint only needs the shared internal secret.
  @UseGuards(InternalAuthGuard)
  @Post('oauth-state')
  async createOAuthState(
    @Body(new ValidationPipe({ whitelist: true })) body: CreateOAuthStateDto,
  ): Promise<{ url: string }> {
    const url = await this.tokenService.buildAuthorizeUrl(body.userId);
    return { url };
  }

  // ----------------------------------------------------------
  // ---------- Unlink the account (called by monolith) -------
  // ----------------------------------------------------------
  // The monolith resolves the athlete id from the logged-in user, so this only
  // needs the shared internal secret.
  @UseGuards(InternalAuthGuard)
  @Post('disconnect')
  async disconnect(@Body(new ValidationPipe({ whitelist: true })) body: DisconnectAthleteDto): Promise<void> {
    await this.tokenService.disconnect(body.athleteId);
  }

  // ----------------------------------------------------------
  // ---------- OAuth callback (called by Strava) -------------
  // ----------------------------------------------------------
  // Public by necessity — Strava redirects the user's browser here. The state is
  // what proves who started the flow; it is single-use and expires.
  @Get('exchange_token')
  async exchangeToken(@Query('code') code: string, @Query('state') state: string, @Res() res: Response): Promise<void> {
    const userID = await this.tokenService.consumeState(state);
    if (!userID) throw new ForbiddenException('Invalid or expired state');

    await this.tokenService.exchangeToken(code, userID);

    // A custom scheme, not an http URL: this runs in the phone's browser, and
    // only a scheme Android knows brings the installed app back to the front.
    // An http address would open a second, logged-out copy of the frontend in
    // the browser tab instead.
    // No slash before the path: APP_DEEP_LINK_URL already ends in "://", and a
    // third slash would leave the app matching a URL it does not expect.
    res.redirect(`${process.env.APP_DEEP_LINK_URL}strava-connected`);
  }
}

// The authorize URL is built in TokenService.buildAuthorizeUrl().
// GET this url after authorization to exchange code for access token
// http://localhost/exchange_token?state=&code=dfce9e855ee68201045782f19a7853633ec3fcb9&scope=read,activity:read_all
