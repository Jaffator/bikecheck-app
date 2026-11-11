import type { Job, Queue } from 'bullmq';
import type { PinoLogger } from 'nestjs-pino';
import { StravaProcessor } from './strava-webhook.processor';
import type { StravaWebhookService } from './strava-webhook.service';
import type { TokenService } from '../tokens/tokens.service';
import type { StravaWebhookEventDto } from './dto/strava-webhook-event.dto';

const ATHLETE_ID = 4242;

const athleteEvent = (updates: Record<string, string>): Job =>
  ({
    name: 'process-strava-event',
    data: {
      aspect_type: 'update',
      object_type: 'athlete',
      object_id: ATHLETE_ID,
      owner_id: ATHLETE_ID,
      event_time: 0,
      subscription_id: 1,
      updates,
    } satisfies StravaWebhookEventDto,
  }) as Job;

describe('StravaProcessor athlete events', () => {
  const tokens = { removeLocalData: jest.fn() };
  const webhook = {
    downloadActivity: jest.fn(),
    purgeStaleActivities: jest.fn(),
    saveActivityData: jest.fn(),
    simplifyActivityData: jest.fn((data: unknown) => data),
  };
  let processor: StravaProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new StravaProcessor(
      { debug: jest.fn() } as unknown as PinoLogger,
      {} as Queue,
      {} as Queue,
      webhook as unknown as StravaWebhookService,
      tokens as unknown as TokenService,
    );
  });

  it('drops the local data when the user revokes access on Strava', async () => {
    const result = await processor.process(athleteEvent({ authorized: 'false' }));

    expect(tokens.removeLocalData).toHaveBeenCalledWith(ATHLETE_ID);
    expect(result).toEqual({ type: 'deauthorized', data: { athleteId: ATHLETE_ID } });
    expect(webhook.downloadActivity).not.toHaveBeenCalled();
  });

  it('ignores any other athlete update', async () => {
    const result = await processor.process(athleteEvent({ title: 'new name' }));

    expect(tokens.removeLocalData).not.toHaveBeenCalled();
    expect(result).toEqual({ skipped: true, reason: 'Athlete update ignored' });
  });

  // Skipped, so the daily purge sends nothing on to the monolith.
  it('purges stale raw activities on the daily job', async () => {
    webhook.purgeStaleActivities.mockResolvedValue(3);

    const result = await processor.process({ name: 'purge-stale-activities', data: {} } as Job);

    expect(webhook.purgeStaleActivities).toHaveBeenCalled();
    expect(result).toEqual({ skipped: true, reason: '3 raw activities purged' });
  });

  // The purge may have removed the raw row an update comes for.
  it('saves an update even when its raw row is gone', async () => {
    webhook.downloadActivity.mockResolvedValue({ data: { type: 'Ride', map: {} } });
    const update = athleteEvent({});
    update.data = { ...update.data, object_type: 'activity', object_id: 98765 };

    await processor.process(update);

    expect(webhook.saveActivityData).toHaveBeenCalledWith({ type: 'Ride', map: {} }, ATHLETE_ID, 98765);
  });
});
