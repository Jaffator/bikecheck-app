import type { strava_pending_activities } from '@prisma/client';
import { isPrivateActivity, toPendingDto } from './pending-activity';

const ANALYSIS = {
  rawJson: { sport_type: 'MountainBikeRide' },
  started_at: '2026-09-20T08:00:00.000Z',
  name: 'Morning Ride',
  summary_polyline: null,
  suspension_minutes: 40,
  health_index_brake_pad: 120,
  drivetrain_km: 30,
  distance_km: 42,
  duration_min: 96,
  elevation_up_m: 612,
};

function pendingRow(analyzed: Record<string, unknown>): strava_pending_activities {
  return {
    id: 1,
    activity_id: BigInt(13579246810),
    user_id: 7,
    gear_id: 'b12345',
    analyzed_data: analyzed as strava_pending_activities['analyzed_data'],
    analyzed_at: new Date('2026-09-20T08:40:00.000Z'),
    created_at: new Date('2026-09-20T08:40:00.000Z'),
    resolved_at: null,
  };
}

describe('toPendingDto', () => {
  it('carries descent and speeds, rounded like the other figures', () => {
    const row = pendingRow({ ...ANALYSIS, elevation_down_m: 597.6, speed_avg: 21.53, max_speed_kmh: 54.49 });

    const dto = toPendingDto(row);

    expect(dto).toMatchObject({ elevation_down_m: 598, speed_avg: 22, max_speed_kmh: 54 });
  });

  it('returns null for figures a row was stored without', () => {
    const dto = toPendingDto(pendingRow(ANALYSIS));

    expect(dto).toMatchObject({ elevation_down_m: null, speed_avg: null, max_speed_kmh: null });
  });

  it('marks a ride only the athlete sees on Strava', () => {
    const dto = toPendingDto(pendingRow({ ...ANALYSIS, rawJson: { visibility: 'only_me' } }));

    expect(dto.is_private).toBe(true);
  });
});

describe('isPrivateActivity', () => {
  it.each([
    [{ visibility: 'only_me' }, true],
    [{ private: true }, true],
    [{ visibility: 'followers_only' }, false],
    [{ visibility: 'everyone', private: false }, false],
    [undefined, false],
  ])('reads %p as private: %p', (rawJson, expected) => {
    expect(isPrivateActivity(rawJson)).toBe(expected);
  });
});
