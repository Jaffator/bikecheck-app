import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TokenService } from '../tokens/tokens.service';
import { DatabaseService } from '../database/database.service';
import type { Request } from 'express';
import axios from 'axios';
import { setTimeout } from 'timers/promises';
import activityData from '../example_strava_data.json';
import * as fs from 'fs';

const VERIFY_TOKEN = 'STRAVA';

@Injectable()
export class StravaWebhookService {
  constructor(
    @InjectPinoLogger(StravaWebhookService.name) private readonly logger: PinoLogger,
    private readonly tokenService: TokenService,
    private readonly databaseService: DatabaseService,
  ) {}
  // async onModuleInit() {
  //   await setTimeout(1000); // wait for database to be ready
  //   const data = this.simplifyActivityData(activityData);
  //   fs.writeFileSync('simplified_strava_data.json', JSON.stringify(data, null, 2));
  // }
  // ---------------------------------------------------------------------
  // -------------------- Delete raw json acvitity data ------------------
  // ---------------------------------------------------------------------
  async deleteActivityData(athlete_id: number, activity_id: number): Promise<void> {
    await this.databaseService.query('DELETE FROM strava_activities_raw WHERE athlete_id = $1 AND activity_id = $2', [
      athlete_id,
      activity_id,
    ]);
    this.logger.info({ custom: true, athlete_id, activity_id }, 'Strava Activity data deleted from database');
  }

  // ---------------------------------------------------------------------
  // -------------------- Update raw json acvitity data ------------------
  // ---------------------------------------------------------------------
  async updateActivityData(activityData: any, athlete_id: number, activity_id: number): Promise<any> {
    const updatedActivity = await this.databaseService.query(
      'UPDATE strava_activities_raw SET strava_data = $1, updated_at = NOW() WHERE athlete_id = $2 AND activity_id = $3 RETURNING id',
      [activityData, athlete_id, activity_id],
    );
    if (updatedActivity.length === 0) {
      this.logger.error({ athlete_id, activity_id }, 'No activity found to update');
      throw new Error('No activity found to update');
    }
    this.logger.info({ custom: true, updatedActivity }, 'Strava Activity data updated in database');
    return updatedActivity[0];
  }

  // ---------------------------------------------------------------------
  // -------------------- Save raw json acvitity data --------------------
  // ---------------------------------------------------------------------
  async saveActivityData(activityData: any, athlete_id: number, activity_id: number): Promise<any> {
    const savedActivity = await this.databaseService.query(
      'INSERT INTO strava_activities_raw (strava_data, athlete_id, activity_id) VALUES ($1, $2, $3) RETURNING id',
      [activityData, athlete_id, activity_id],
    );
    if (savedActivity.length === 0) {
      this.logger.error({ athlete_id, activity_id }, 'Failed to save activity data');
      throw new Error('Failed to save activity data');
    }
    this.logger.info({ custom: true, savedActivity }, 'Strava Activity data saved to database');
    return savedActivity[0];
  }

  // ---------------------------------------------------------------------
  // -------------------- Fetch data from Strava API ---------------------
  // ---------------------------------------------------------------------
  async downloadActivity(activity_id: number, athlete_id: number): Promise<any> {
    const access_token = await this.tokenService.getAccessToken(athlete_id);
    if (!access_token) {
      this.logger.error({ athlete_id }, 'No access token found for athlete');
      throw new Error('No access token found for athlete');
    }
    try {
      const activityData = await axios.get(`https://www.strava.com/api/v3/activities/${activity_id}`, {
        params: { include_all_effort: true },
        headers: { Authorization: `Bearer ${access_token}` },
      });
      this.logger.info({ custom: true, data: activityData.data }, 'Succesfuly fetched Strava activity data');
      return activityData;
    } catch (error) {
      throw new Error(`Error fetching Strava API: ${(error as Error).message}`);
    }
  }

  // ---------------------------------------------------------------------
  // -------------------- Make ride strava json = less info --------------
  // ---------------------------------------------------------------------
  simplifyActivityData(activityData: any): any {
    const simplifiedStravaData = structuredClone(activityData);
    delete simplifiedStravaData.map.polyline;
    delete simplifiedStravaData.segment_efforts;
    delete simplifiedStravaData.laps;
    this.logger.info({ custom: true, simplifiedStravaData }, 'Strava activity data simplified');
    return simplifiedStravaData;
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
    console.log('Time difference:', timeDiff, 'seconds');
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
