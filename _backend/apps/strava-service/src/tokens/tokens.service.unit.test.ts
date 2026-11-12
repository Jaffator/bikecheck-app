import { TokenService, hasRequiredScopes } from './tokens.service';
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
      'https://www.strava.com/oauth/revoke',
      expect.objectContaining({}),
      expect.objectContaining({ auth: expect.anything() }),
    );
    expect(String(mockPost.mock.calls[0][1])).toBe('token=token&token_type_hint=access_token');
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

describe('hasRequiredScopes', () => {
  it('accepts a grant with the gear list and Only Me activities', () => {
    expect(hasRequiredScopes('read,activity:read_all,profile:read_all')).toBe(true);
    expect(hasRequiredScopes('read activity:read_all profile:read_all')).toBe(true);
  });

  // The athlete can untick either box on Strava's page.
  it('refuses a grant missing either scope, or none at all', () => {
    expect(hasRequiredScopes('read,activity:read_all')).toBe(false);
    expect(hasRequiredScopes('read,profile:read_all,activity:read')).toBe(false);
    expect(hasRequiredScopes(undefined)).toBe(false);
  });
});

describe('TokenService.rejectGrant', () => {
  it('exchanges the code only to revoke it, saving nothing', async () => {
    const database = { query: jest.fn(), transaction: jest.fn() };
    const queue = { add: jest.fn() };
    const service = new TokenService(
      { warn: jest.fn() } as unknown as PinoLogger,
      queue as unknown as Queue,
      database as unknown as DatabaseService,
    );
    mockPost.mockReset();
    mockPost.mockResolvedValueOnce({ data: { access_token: 'half' } });

    await service.rejectGrant('code');

    expect(mockPost).toHaveBeenLastCalledWith(
      'https://www.strava.com/oauth/revoke',
      expect.anything(),
      expect.objectContaining({ auth: expect.anything() }),
    );
    expect(String(mockPost.mock.calls[1][1])).toBe('token=half&token_type_hint=access_token');
    expect(queue.add).not.toHaveBeenCalled();
    expect(database.query).not.toHaveBeenCalled();
  });
});
