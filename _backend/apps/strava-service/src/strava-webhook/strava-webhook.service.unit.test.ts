import { NotFoundException } from '@nestjs/common';
import axios from 'axios';
import type { PinoLogger } from 'nestjs-pino';
import { StravaWebhookService } from './strava-webhook.service';
import type { TokenService } from '../tokens/tokens.service';
import type { DatabaseService } from '../database/database.service';

jest.mock('axios');

const ATHLETE_ID = 4242;
const ACTIVITY_ID = 98765;

describe('StravaWebhookService retention and re-fetch', () => {
  const query = jest.fn();
  const tokens = { getAccessToken: jest.fn().mockResolvedValue('token') };
  const logger = { info: jest.fn(), error: jest.fn() };
  let service: StravaWebhookService;

  beforeEach(() => {
    jest.resetAllMocks();
    tokens.getAccessToken.mockResolvedValue('token');
    service = new StravaWebhookService(
      logger as unknown as PinoLogger,
      tokens as unknown as TokenService,
      { query } as unknown as DatabaseService,
    );
  });

  it('purges raw activities untouched for 7 days', async () => {
    query.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    await expect(service.purgeStaleActivities()).resolves.toBe(2);
    expect(query.mock.calls[0][0]).toContain("COALESCE(updated_at, created_at) < NOW() - INTERVAL '7 days'");
  });

  it('answers 404 for an activity Strava no longer gives', async () => {
    const gone = { isAxiosError: true, response: { status: 404 }, message: 'Not Found' };
    (axios.get as jest.Mock).mockRejectedValue(gone);
    (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

    await expect(service.fetchRide(ATHLETE_ID, ACTIVITY_ID)).rejects.toThrow(NotFoundException);
  });

  it('lets any other Strava failure through, so the caller retries', async () => {
    (axios.get as jest.Mock).mockRejectedValue({ response: { status: 500 }, message: 'Server Error' });
    (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

    await expect(service.fetchRide(ATHLETE_ID, ACTIVITY_ID)).rejects.not.toThrow(NotFoundException);
  });

  it('answers 404 for an activity that is not a ride', async () => {
    (axios.get as jest.Mock).mockResolvedValue({ data: { type: 'Run', map: {} } });

    await expect(service.fetchRide(ATHLETE_ID, ACTIVITY_ID)).rejects.toThrow(NotFoundException);
  });
});
