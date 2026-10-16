import { TokenService } from './tokens.service';
import type { DatabaseService } from '../database/database.service';
import type { PinoLogger } from 'nestjs-pino';
import type { Queue } from 'bullmq';

const ATHLETE_ID = 4242;

describe('TokenService.forget', () => {
  const query = jest.fn();
  const logger = { info: jest.fn(), warn: jest.fn() };
  let service: TokenService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TokenService(logger as unknown as PinoLogger, {} as Queue, { query } as unknown as DatabaseService);
  });

  // A deleted BikeCheck account: the unlink Settings does, and the webhook copies of the rides too (#272).
  it('unlinks the athlete and removes their raw activities', async () => {
    const disconnect = jest.spyOn(service, 'disconnect').mockResolvedValue();

    await service.forget(ATHLETE_ID);

    expect(disconnect).toHaveBeenCalledWith(ATHLETE_ID);
    expect(query).toHaveBeenCalledWith('DELETE FROM strava_activities_raw WHERE athlete_id = $1', [ATHLETE_ID]);
  });

  it('keeps the raw activities when the unlink fails, so a retry still finds the athlete', async () => {
    jest.spyOn(service, 'disconnect').mockRejectedValue(new Error('db down'));

    await expect(service.forget(ATHLETE_ID)).rejects.toThrow('db down');
    expect(query).not.toHaveBeenCalled();
  });
});
