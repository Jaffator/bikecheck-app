import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { randomUUID } from 'crypto';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { DatabaseService } from '../database/database.service';
import { Queue } from 'bullmq';
import axios from 'axios';
import 'dotenv/config';
import { InjectQueue } from '@nestjs/bullmq/dist/decorators/inject-queue.decorator';

interface StravaTokenResponse {
  athlete_id: number;
  refresh_token: string;
  access_token: string;
  scope?: string;
  expires_at: number;
}

@Injectable()
export class TokenService {
  constructor(
    @InjectPinoLogger(TokenService.name) private readonly logger: PinoLogger,
    @InjectQueue('strava-monolith-queue') private readonly eventsQueue: Queue,
    private readonly databaseService: DatabaseService,
  ) {}

  // async onModuleInit() {
  //   console.log(await this.getAccessToken(20678962));
  // }

  /**
   * Starts the OAuth flow for a user the monolith has already authenticated.
   * The returned URL carries a random state, never the user id — the user could
   * edit the id in the browser and link their Strava account to someone else.
   */
  async buildAuthorizeUrl(userId: number): Promise<string> {
    const state = randomUUID();

    await this.databaseService.query(
      `INSERT INTO oauth_states (state, user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [state, userId],
    );

    const params = new URLSearchParams({
      client_id: String(process.env.STRAVA_CLIENT_ID),
      response_type: 'code',
      redirect_uri: `${process.env.STRAVA_SERVICE_URL}/strava/exchange_token`,
      approval_prompt: 'force',
      scope: 'profile:read_all,activity:read_all,activity:write,read_all',
      state,
    });

    // this.logger.info({ custom: true, userId }, 'Strava authorize URL issued');
    return `https://www.strava.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Resolves a state from the callback back to the user who started the flow.
   * DELETE ... RETURNING makes the lookup atomic and single-use, so a state
   * cannot be replayed. Expired or unknown states resolve to null.
   */
  async consumeState(state: string): Promise<number | null> {
    if (!state) return null;

    const rows = await this.databaseService.query<{ user_id: number }>(
      `DELETE FROM oauth_states
       WHERE state = $1 AND expires_at > NOW()
       RETURNING user_id`,
      [state],
    );

    return rows[0]?.user_id ?? null;
  }

  async getAccessToken(athleteID: number): Promise<string> {
    // get access token from db
    const tokenInfo: any = await this.databaseService.query(
      'SELECT expires_at, access_token FROM access_tokens WHERE athlete_id = $1',
      [athleteID],
    );
    if (!tokenInfo[0]) {
      this.logger.error({ athleteID }, 'No access token found for athlete: ' + athleteID);
      throw new Error(`No tokens found for athlete_id: ${athleteID}`);
    }

    // check token expiration
    if (new Date(Date.now() - 5 * 60 * 1000) > tokenInfo[0].expires_at) {
      // call for new token using refresh token

      return await this._getNewAccessToken(athleteID);
    }
    // Access token still valid, return it

    return tokenInfo[0].access_token;
  }

  async exchangeToken(code: string, userID: number): Promise<boolean> {
    // Get refresh and access tokens from Strava API
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
    });

    // Send UserID and the athlete profile to monolith. The profile travels with
    // the link event because this is the only moment it is on hand — Strava
    // returns it with the token, and nothing fetches it again later.
    await this.eventsQueue.add('strava-authorization', {
      athlete_id: response.data.athlete.id,
      user_id: userID,
      firstname: response.data.athlete.firstname ?? null,
      lastname: response.data.athlete.lastname ?? null,
      username: response.data.athlete.username ?? null,
      // 'profile' is the large picture; 'profile_medium' is the small one.
      avatar_url: response.data.athlete.profile ?? null,
    });

    // Save the tokens data to the database
    const result = await this.saveStravaAuthData({
      athlete_id: response.data.athlete.id,
      refresh_token: response.data.refresh_token,
      access_token: response.data.access_token,
      scope: response.data.scope,
      expires_at: response.data.expires_at,
    });
    return result;
  }

  /**
   * Drops the link to a Strava account: tells Strava to revoke the grant, then
   * removes both tokens. The revoke is best effort — a grant the user already
   * withdrew on Strava's own site answers with an error, and that must not stop
   * the local rows from going away, or the account could never be unlinked.
   */
  async disconnect(athleteID: number): Promise<void> {
    try {
      const accessToken = await this.getAccessToken(athleteID);
      await axios.post('https://www.strava.com/oauth/deauthorize', { access_token: accessToken }, { timeout: 5000 });
    } catch (err) {
      this.logger.warn({ err, athleteID }, 'Strava deauthorize failed, removing local tokens anyway');
    }

    await this.databaseService.transaction(async (client) => {
      await client.query('DELETE FROM access_tokens WHERE athlete_id = $1', [athleteID]);
      await client.query('DELETE FROM refresh_tokens WHERE athlete_id = $1', [athleteID]);
    });

    this.logger.info({ custom: true, athlete_id: athleteID }, 'Strava tokens removed');
  }

  private async _getNewAccessToken(athleteID: number): Promise<string> {
    const refreshToken = await this.databaseService.query<{ refresh_token: string }>(
      'SELECT refresh_token FROM refresh_tokens WHERE athlete_id = $1',
      [athleteID],
    );
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken[0].refresh_token,
    });
    // Response not ok
    if (!response.data || !('access_token' in response.data)) {
      // this.logger.error('Failed to refresh Strava access token');
      // this.logger.error({ response: response.data }, 'Failed to refresh Strava access token');
      throw new Error('Failed to refresh Strava access token');
    }
    // Response ok, update the database with new tokens
    await this._updateStravaAuthData({
      athlete_id: athleteID,
      refresh_token: response.data.refresh_token,
      access_token: response.data.access_token,
      expires_at: response.data.expires_at,
    });
    return response.data.access_token;
  }
  private async _updateStravaAuthData(data: StravaTokenResponse): Promise<void> {
    try {
      await this.databaseService.transaction(async (client) => {
        const accessUpdate = await client.query(
          'UPDATE access_tokens SET access_token = $1, expires_at = $2 WHERE athlete_id = $3',
          [data.access_token, new Date(data.expires_at * 1000), data.athlete_id],
        );
        const refreshUpdate = await client.query(
          'UPDATE refresh_tokens SET refresh_token = $1, expires_at = $2 WHERE athlete_id = $3',
          [data.refresh_token, new Date(data.expires_at * 1000), data.athlete_id],
        );
        if (
          accessUpdate === null ||
          accessUpdate.rowCount === 0 ||
          refreshUpdate === null ||
          refreshUpdate.rowCount === 0
        ) {
          throw new Error(`Failed to update Strava tokens for athlete_id: ${data.athlete_id}`);
        }
      });

      this.logger.info({ custom: true, athlete_id: data.athlete_id }, 'Strava tokens updated');
    } catch (err) {
      this.logger.error({ err }, 'Failed to save Strava auth data to the database');
      throw err;
    }
  }

  private async saveStravaAuthData(data: StravaTokenResponse): Promise<boolean> {
    // Save the tokens data to the database
    try {
      const result = await this.databaseService.transaction(async (client) => {
        await client.query(
          `INSERT INTO access_tokens (athlete_id, access_token, scope, expires_at) VALUES ($1, $2, $3, $4)   ON CONFLICT (athlete_id) DO UPDATE
          SET access_token = EXCLUDED.access_token,
          scope = EXCLUDED.scope,
          expires_at = EXCLUDED.expires_at`,
          [data.athlete_id, data.access_token, data.scope, new Date(data.expires_at * 1000)],
        );
        await client.query(
          `INSERT INTO refresh_tokens (athlete_id, refresh_token, scope, expires_at) VALUES ($1, $2, $3, $4)
          ON CONFLICT (athlete_id) DO UPDATE
          SET refresh_token = EXCLUDED.refresh_token,
          scope = EXCLUDED.scope,
          expires_at = EXCLUDED.expires_at`,
          [data.athlete_id, data.refresh_token, data.scope, new Date(data.expires_at * 1000)],
        );
        return true;
      });
      this.logger.info(
        { custom: true, athlete_id: data.athlete_id },
        'Strava auth data saved to the database: Athlete ID: ' + data.athlete_id,
      );
      return result;
    } catch (err) {
      this.logger.error({ err }, 'Failed to save Strava auth data to the database');
      throw err;
    }
  }
}

// EXAMPLE RESPONSE FROM STRAVA TOKEN EXCHANGE
// {
//   token_type: 'Bearer',
//   expires_at: 1779231173,
//   expires_in: 21155,
//   refresh_token: '08e6383b47da239a96ff340102d85bd6e887f40d',
//   access_token: '82754222bee3143fcd1ff3185680750979aa48ff',
//   scope: 'activity:read_all read',
//   athlete: {
//     id: 20678962,
//     username: 'jlufinka',
//     resource_state: 2,
//     firstname: 'Jaroslav',
//     lastname: 'Lufinka',
//     bio: '',
//     city: '',
//     state: '',
//     country: null,
//     sex: null,
//     premium: false,
//     summit: false,
//     created_at: '2017-03-25T10:31:24Z',
//     updated_at: '2025-08-19T06:27:55Z',
//     badge_type_id: 0,
//     profile_medium: 'https://dgalywyr863hv.cloudfront.net/pictures/athletes/20678962/34165261/1/medium.jpg',
//     profile: 'https://dgalywyr863hv.cloudfront.net/pictures/athletes/20678962/34165261/1/large.jpg',
//     friend: null,
//     follower: null
//   }
// }
