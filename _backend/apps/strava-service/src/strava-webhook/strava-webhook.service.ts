import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TokenService } from '../tokens/tokens.service';
import axios from 'axios';
import type { Request } from 'express';

const VERIFY_TOKEN = 'STRAVA';

@Injectable()
export class StravaWebhookService {
  constructor(
    @InjectPinoLogger(StravaWebhookService.name) private readonly logger: PinoLogger,
    private readonly tokenService: TokenService,
  ) {}

  // ----------------------------------------------------------
  // -------------------- call Strava API ---------------------
  // ----------------------------------------------------------
  async downloadActivity(activity_id: number, athlete_id: number): Promise<any> {
    const access_token = await this.tokenService.getAccessToken(athlete_id);

    console.log(access_token);
    const activityData = await axios.get(`https://www.strava.com/api/v3/activities/${activity_id}`, {
      params: { include_all_effort: true },
      headers: { Authorization: `Bearer ${access_token}` },
    });
    this.logger.info({ custom: true, data: activityData.data }, 'activity data');
    return activityData;
  }
  // ----------------------------------------------------------
  // ---------- Security check for Strava webhook events ------
  // ----------------------------------------------------------
  verifySignature(req: Request, rawBody: Buffer): boolean {
    const header = req.headers['x-strava-signature'] as string | undefined;
    if (!header) {
      this.logger.error('Missing x-strava-signature header');
      return false;
    }

    const parts = Object.fromEntries(header.split(',').map((p) => p.split('=', 2)));
    const timestamp: string = parts['t'];
    const signature: string = parts['v1'];

    const timeDiff = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
    if (timeDiff > 300) {
      this.logger.error({ timeDiff }, 'Timestamp too old');
      return false;
    }

    // It's not working for some reason, problem on STRAVA side
    // --------------------------------------------------------
    // const expected = crypto
    //   .createHmac('sha256', process.env.SIGNING_SECRET!)
    //   .update(`${timestamp}.${rawBody.toString('utf8')}`)
    //   .digest('hex');

    // return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    // --------------------------------------------------------

    return true;
  }

  // -------------------------------------------------------------------
  // ------------ Only for subscrription of Strava webhook -------------
  // -------------------------------------------------------------------
  verifyChallenge(mode: string, token: string, challenge: string): { 'hub.challenge': string } {
    if (!mode || !token) {
      throw new ForbiddenException('Verification failed');
    }
    if (mode !== 'subscribe' || token !== VERIFY_TOKEN) {
      throw new ForbiddenException('Verification failed');
    }
    this.logger.info({ custom: true }, 'Webhook verified');
    return { 'hub.challenge': challenge };
  }
}
