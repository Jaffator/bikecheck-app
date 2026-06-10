import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { DatabaseService } from '../database/database.service';
import axios from 'axios';
import 'dotenv/config';

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
    private readonly databaseService: DatabaseService,
  ) {}

  // async onModuleInit() {
  //   console.log(await this.getAccessToken(20678962));
  // }

  async getAccessToken(athleteID: number): Promise<string> {
    // get access token from db
    const tokenInfo: any = await this.databaseService.query(
      'SELECT expires_at, access_token FROM access_tokens WHERE athlete_id = $1',
      [athleteID],
    );
    if (!tokenInfo[0]) {
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

  async exchangeToken(code: string): Promise<boolean> {
    // Get refresh and access tokens from Strava API
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
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
          'INSERT INTO access_tokens (athlete_id, access_token, scope, expires_at) VALUES ($1, $2, $3, $4)',
          [data.athlete_id, data.access_token, data.scope, new Date(data.expires_at * 1000)],
        );
        await client.query(
          'INSERT INTO refresh_tokens (athlete_id, refresh_token, scope, expires_at) VALUES ($1, $2, $3, $4)',
          [data.athlete_id, data.refresh_token, data.scope, new Date(data.expires_at * 1000)],
        );
        return true;
      });
      this.logger.info({ custom: true, athlete_id: data.athlete_id }, 'Strava auth data saved to the database');
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
