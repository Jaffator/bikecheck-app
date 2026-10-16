import { TokenService } from './tokens.service';
import type { DatabaseService } from '../database/database.service';
import type { PinoLogger } from 'nestjs-pino';
import type { Queue } from 'bullmq';

// Strava's revoke endpoint; asserted, never reached.
const mockPost = jest.fn();
jest.mock('axios', () => ({ __esModule: true, default: { post: (...args: unknown[]): unknown => mockPost(...args) } }));

const ATHLETE_ID = 4242;

describe('TokenService.disconnect', () => {
  const clientQuery = jest.fn();
  const database = {
    transaction: jest.fn(async (run: (client: { query: jest.Mock }) => Promise<void>) => run({ query: clientQuery })),
  };
  const logger = { info: jest.fn(), warn: jest.fn() };
  let service: TokenService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TokenService(logger as unknown as PinoLogger, {} as Queue, database as unknown as DatabaseService);
    jest.spyOn(service, 'getAccessToken').mockResolvedValue('token');
  });

  // Unlinking in Settings or deleting the account: nothing taken from Strava stays behind (#272).
  it('revokes the grant and drops the tokens and the raw activities', async () => {
    await service.disconnect(ATHLETE_ID);

    expect(mockPost).toHaveBeenCalledWith(
      'https://www.strava.com/oauth/deauthorize',
      { access_token: 'token' },
      expect.anything(),
    );
    expect(clientQuery.mock.calls.map(([sql]) => sql)).toEqual([
      'DELETE FROM access_tokens WHERE athlete_id = $1',
      'DELETE FROM refresh_tokens WHERE athlete_id = $1',
      'DELETE FROM strava_activities_raw WHERE athlete_id = $1',
    ]);
  });

  it('still drops everything when Strava refuses the revoke', async () => {
    mockPost.mockRejectedValueOnce(new Error('401'));

    await service.disconnect(ATHLETE_ID);

    expect(clientQuery).toHaveBeenCalledTimes(3);
  });
});
