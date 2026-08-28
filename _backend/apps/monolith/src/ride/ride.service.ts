import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResponseRideDto, ResponseRidePageDto } from './dto/response-ride.dto';

const DEFAULT_LIMIT = 20;
// One request cannot drain the table. The raw Strava payload no longer leaves the
// server - only the name and the route are lifted out of it - but a page is still
// a page of rows.
const MAX_LIMIT = 100;

// The bike as the list needs it. Selected rather than included whole: the ride
// list has no use for the rest of the bike.
const BIKE_SELECT = { bike_brand: true, bike_model: true, year: true } as const;

interface RideRow {
  id: number;
  activity_strava_id: bigint | null;
  bike_id: number;
  bikes: { bike_brand?: string | null; bike_model?: string | null; year?: number | null } | null;
  started_at?: Date | null;
  distance_m?: number | null;
  duration_min?: number | null;
  elevation_up_m?: number | null;
  elevation_down_m?: number | null;
  speed_avg?: number | null;
  max_speed_kmh?: number | null;
  json_data?: unknown;
}

@Injectable()
export class RideService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One page of the user's confirmed rides, newest first.
   */
  async findPage(userId: number, limit: number, offset: number): Promise<ResponseRidePageDto> {
    const take = clamp(limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    const skip = clamp(offset, 0, 0, Number.MAX_SAFE_INTEGER);

    // is_deleted is nullable, so `not: true` is what covers both false and the
    // null rows written before the column existed.
    const where = { user_id: userId, is_deleted: { not: true } };

    const [rows, total] = await Promise.all([
      this.prisma.rides.findMany({
        where,
        // Nulls last: a ride with no start date belongs at the bottom rather
        // than ahead of everything the user actually rode.
        orderBy: { started_at: { sort: 'desc', nulls: 'last' } },
        take,
        skip,
        include: { bikes: { select: BIKE_SELECT } },
      }),
      this.prisma.rides.count({ where }),
    ]);

    return { items: (rows as RideRow[]).map(toRideDto), total };
  }
}

// Keeps a client-supplied number inside what the endpoint will serve, and
// falls back to the default when it is not a number at all.
function clamp(value: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), min), max);
}

// What the list needs out of the stored Strava payload. Read together in one pass:
// the blob is large, and parsing it twice to answer two questions is the cost this
// endpoint is trying to avoid.
interface ActivityFacts {
  name: string;
  summary_polyline: string | null;
}

interface StravaActivity {
  name?: unknown;
  map?: { summary_polyline?: unknown } | null;
}

// The title and the route, read out of the stored payload. It is written with
// JSON.stringify, but Prisma hands a Json column back parsed, so both shapes are
// accepted rather than assuming either. Strava always sends a name, so the empty
// string is a type-level floor, not an expected state; the route is genuinely
// absent for a ride recorded without GPS.
function activityFacts(jsonData: unknown): ActivityFacts {
  const activity = asActivity(jsonData);
  const name = activity?.name;
  const polyline = activity?.map?.summary_polyline;

  return {
    name: typeof name === 'string' ? name : '',
    summary_polyline: typeof polyline === 'string' && polyline.length > 0 ? polyline : null,
  };
}

function asActivity(jsonData: unknown): StravaActivity | null {
  if (typeof jsonData === 'string') {
    try {
      return asActivity(JSON.parse(jsonData) as unknown);
    } catch {
      // A payload that will not parse carries neither a name nor a route.
      return null;
    }
  }
  return typeof jsonData === 'object' && jsonData !== null ? (jsonData as StravaActivity) : null;
}

// A ride is a record of what was ridden, so the bike is named by what it is -
// never by the nickname its owner gave it. Every part is optional, so the pieces
// are joined rather than templated.
function bikeName(bike: RideRow['bikes']): string | null {
  if (bike === null) return null;
  const parts = [bike.bike_brand, bike.bike_model, bike.year].filter(
    (part): part is string | number => Boolean(part),
  );
  return parts.length > 0 ? parts.join(' ') : null;
}

function toRideDto(row: RideRow): ResponseRideDto {
  const facts = activityFacts(row.json_data);

  return {
    id: row.id,
    // BigInt does not survive JSON, and the id is past 2^53 anyway.
    activity_strava_id: row.activity_strava_id === null ? null : String(row.activity_strava_id),
    bike_id: row.bike_id,
    bike_name: bikeName(row.bikes),
    name: facts.name,
    started_at: row.started_at ? row.started_at.toISOString() : null,
    distance_m: row.distance_m ?? null,
    duration_min: row.duration_min ?? null,
    elevation_up_m: row.elevation_up_m ?? null,
    elevation_down_m: row.elevation_down_m ?? null,
    speed_avg: row.speed_avg ?? null,
    max_speed_kmh: row.max_speed_kmh ?? null,
    summary_polyline: facts.summary_polyline,
  };
}
