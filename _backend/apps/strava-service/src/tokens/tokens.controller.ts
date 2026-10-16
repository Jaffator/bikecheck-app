import { Body, Controller, ForbiddenException, Get, Post, Query, Res, UseGuards, ValidationPipe } from '@nestjs/common';
import type { Response } from 'express';
import { TokenService } from './tokens.service';
import { InternalAuthGuard } from '../common/internal-auth.guard';
import { CreateOAuthStateDto } from './dto/create-oauth-state.dto';
import { DisconnectAthleteDto } from './dto/disconnect-athlete.dto';
import type { StravaReturnTo } from '@contracts/strava-oauth.contract';

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
    const url = await this.tokenService.buildAuthorizeUrl(body.userId, body.returnTo ?? 'native');
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
  // ---------- Forget the athlete (called by monolith) -------
  // ----------------------------------------------------------
  // On account deletion; the athlete id was read before the user row went.
  @UseGuards(InternalAuthGuard)
  @Post('forget')
  async forget(@Body(new ValidationPipe({ whitelist: true })) body: DisconnectAthleteDto): Promise<void> {
    await this.tokenService.forget(body.athleteId);
  }

  // ----------------------------------------------------------
  // ---------- OAuth callback (called by Strava) -------------
  // ----------------------------------------------------------
  // Public by necessity — Strava redirects the user's browser here. The state is
  // what proves who started the flow; it is single-use and expires.
  @Get('exchange_token')
  async exchangeToken(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const oauthState = await this.tokenService.consumeState(state);
    if (!oauthState) throw new ForbiddenException('Invalid or expired state');

    // Strava sends error=access_denied when the athlete declines; there is no code to exchange.
    if (error !== undefined) {
      res.redirect(returnUrl(oauthState.return_to, false));
      return;
    }

    await this.tokenService.exchangeToken(code, oauthState.user_id);
    res.redirect(returnUrl(oauthState.return_to, true));
  }
}

// Desktop started in the same tab, so it returns to the web app; a phone returns through the
// custom scheme, the only URL that brings the installed app back to the front.
function returnUrl(returnTo: StravaReturnTo, connected: boolean): string {
  if (returnTo === 'web') return new URL(connected ? '/strava-connected' : '/', process.env.FRONTEND_URL).toString();
  // No slash before the path: APP_DEEP_LINK_URL already ends in "://".
  return `${process.env.APP_DEEP_LINK_URL}${connected ? 'strava-connected' : 'strava-denied'}`;
}

// The authorize URL is built in TokenService.buildAuthorizeUrl().
// GET this url after authorization to exchange code for access token
// http://localhost/exchange_token?state=&code=dfce9e855ee68201045782f19a7853633ec3fcb9&scope=read,activity:read_all
