import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { check_in_status, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ServiceTrackingService } from '../service-tracking/service-tracking.service';
import type { Response_WoreOffLineDto } from '../service-tracking/dto/response-wore-off-line';
import { ResponseRideCheckInDto, ResponseRideDto, ResponseRidePageDto } from './dto/response-ride.dto';
import { SaveRideCheckInDto } from './dto/save-ride-check-in.dto';
import { isDay, isTimeZone, localDay, previousRange, startedWithin, type DayRange } from './ride-period';
import { figuresOf, summedRideSelect, weeksOf, type SummedRide } from './ride-totals';

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
  check_in?: CheckInRow | null;
}

const CHECK_IN_SELECT = { status: true, symptoms: true, note: true } satisfies Prisma.ride_check_insSelect;
type CheckInRow = Prisma.ride_check_insGetPayload<{ select: typeof CHECK_IN_SELECT }>;

// The drawer offers rides started this recently; older ones are no longer remembered.
const CHECK_IN_PROMPT_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class RideService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly serviceTracking: ServiceTrackingService,
  ) {}

  /**
   * The rides the phone's check-in drawer offers: recent ones without a check-in, newest first,
   * and none at all until a ride has arrived since the drawer last opened.
   */
  async findCheckInPrompt(userId: number, now: Date = new Date()): Promise<ResponseRideDto[]> {
    const user = await this.prisma.users.findUnique({ where: { id: userId }, select: { check_in_prompted_at: true } });
    const rows = await this.prisma.rides.findMany({
      where: { ...listedRidesWhere(userId), started_at: { gte: promptSince(now) } },
      orderBy: { started_at: 'desc' },
      include: { bikes: { select: BIKE_SELECT }, check_in: { select: CHECK_IN_SELECT } },
    });

    const offered = promptedRides(rows, user?.check_in_prompted_at ?? null, now);
    const woreOff = await this.serviceTracking.getWoreOff(userId, offered);
    return (offered as RideRow[]).map((row) => toRideDto(row, woreOff.get(row.id) ?? []));
  }

  // Saving again overwrites: a ride keeps only its last check-in.
  async saveCheckIn(userId: number, rideId: number, body: SaveRideCheckInDto): Promise<ResponseRideCheckInDto> {
    await this.findOwnRide(userId, rideId);
    const data = {
      status: body.status,
      symptoms: body.status === check_in_status.ISSUE ? [...new Set(body.symptoms ?? [])] : [],
      note: body.note?.trim() || null,
    };
    return this.prisma.ride_check_ins.upsert({
      where: { ride_id: rideId },
      create: { ride_id: rideId, ...data },
      update: data,
      select: CHECK_IN_SELECT,
    });
  }

  async deleteCheckIn(userId: number, rideId: number): Promise<void> {
    await this.findOwnRide(userId, rideId);
    await this.prisma.ride_check_ins.deleteMany({ where: { ride_id: rideId } });
  }

  // The phone calls this as the drawer opens, so only a ride arriving later opens it again.
  async markCheckInPromptSeen(userId: number, now: Date = new Date()): Promise<void> {
    await this.prisma.users.update({ where: { id: userId }, data: { check_in_prompted_at: now } });
  }

  private async findOwnRide(userId: number, rideId: number): Promise<void> {
    const ride = await this.prisma.rides.findFirst({
      where: { id: rideId, user_id: userId, is_deleted: { not: true } },
      select: { id: true },
    });
    if (!ride) throw new NotFoundException('Ride not found');
  }

  /**
   * One page of the user's confirmed rides, newest first. Narrowed to one bike when the
   * caller names one - which is how the archive dialog says how many rides stop counting.
   */
  async findPage(
    userId: number,
    limit: number,
    offset: number,
    bikeId?: number,
    period: RidePeriodQuery = {},
  ): Promise<ResponseRidePageDto> {
    const take = clamp(limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    const skip = clamp(offset, 0, 0, Number.MAX_SAFE_INTEGER);
    const { tz, range } = checkedPeriod(period);

    // is_deleted is nullable, so `not: true` is what covers both false and the
    // null rows written before the column existed. Across every bike an Archived Bike's
    // rides leave the list with it; asked for by id its own rides still read (ADR 0024).
    const ridden: Prisma.ridesWhereInput = {
      user_id: userId,
      is_deleted: { not: true },
      ...(bikeId === undefined ? { bikes: { is_deleted: { not: true } } } : { bike_id: bikeId }),
    };
    const where = withinRange(ridden, range, tz);
    const previous = range.from !== undefined && range.to !== undefined ? previousRange(range.from, range.to) : null;

    const [rows, total, summed, before] = await Promise.all([
      this.prisma.rides.findMany({
        where,
        // Nulls last: a ride with no start date belongs at the bottom rather
        // than ahead of everything the user actually rode.
        orderBy: { started_at: { sort: 'desc', nulls: 'last' } },
        take,
        skip,
        include: { bikes: { select: BIKE_SELECT }, check_in: { select: CHECK_IN_SELECT } },
      }),
      this.prisma.rides.count({ where }),
      this.summedRides(where),
      previous === null ? Promise.resolve(null) : this.summedRides(withinRange(ridden, previous, tz)),
    ]);

    // Only this page's rides: the extra reading is paid per page, not per list.
    const woreOff = await this.serviceTracking.getWoreOff(userId, rows);

    return {
      items: (rows as RideRow[]).map((row) => toRideDto(row, woreOff.get(row.id) ?? [])),
      total,
      weeks: weeksOf(rows, summed, tz),
      figures: figuresOf(summed, before),
    };
  }

  // The months the desktop filter offers: every month the rider has a ride in, newest first.
  async findMonths(userId: number, tz = 'UTC'): Promise<string[]> {
    if (!isTimeZone(tz)) throw new BadRequestException('Unknown time zone');
    const rows = await this.prisma.rides.findMany({ where: listedRidesWhere(userId), select: { started_at: true } });
    const months = rows.flatMap((row) => (row.started_at ? [localDay(row.started_at, tz).slice(0, 7)] : []));
    return [...new Set(months)].sort((a, b) => b.localeCompare(a));
  }

  // Every ride in the filter, but only the columns the totals add up.
  private async summedRides(where: Prisma.ridesWhereInput): Promise<SummedRide[]> {
    return this.prisma.rides.findMany({ where, select: summedRideSelect });
  }
}

// The user's rides the lists show: not deleted, and not on an Archived Bike (ADR 0024).
function listedRidesWhere(userId: number): Prisma.ridesWhereInput {
  return { user_id: userId, is_deleted: { not: true }, bikes: { is_deleted: { not: true } } };
}

function promptSince(now: Date): Date {
  return new Date(now.getTime() - CHECK_IN_PROMPT_DAYS * DAY_MS);
}

interface PromptRow {
  started_at: Date | null;
  created_at: Date | null;
  check_in: CheckInRow | null;
}

// A ride that arrived after the last drawer opens it; skipped rides come back with it while recent.
function promptedRides<T extends PromptRow>(rows: T[], promptedAt: Date | null, now: Date): T[] {
  const since = promptSince(now);
  const recent = rows.filter((row) => row.started_at !== null && row.started_at >= since);
  const arrived = recent.some((row) => promptedAt === null || (row.created_at !== null && row.created_at > promptedAt));
  return arrived ? recent.filter((row) => row.check_in === null) : [];
}

export interface RidePeriodQuery {
  from?: string;
  to?: string;
  tz?: string;
}

// Rubbish in the query is the caller's mistake, never an empty page.
function checkedPeriod(period: RidePeriodQuery): { tz: string; range: DayRange } {
  const tz = period.tz ?? 'UTC';
  if (!isTimeZone(tz)) throw new BadRequestException('Unknown time zone');
  for (const day of [period.from, period.to]) {
    if (day !== undefined && !isDay(day)) throw new BadRequestException('A day is YYYY-MM-DD');
  }
  return { tz, range: { from: period.from, to: period.to } };
}

function withinRange(where: Prisma.ridesWhereInput, range: DayRange, tz: string): Prisma.ridesWhereInput {
  const started = startedWithin(range, tz);
  return started === null ? where : { ...where, started_at: started };
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

function toRideDto(row: RideRow, woreOff: Response_WoreOffLineDto[]): ResponseRideDto {
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
    wore_off: woreOff,
    check_in: row.check_in ? { status: row.check_in.status, symptoms: row.check_in.symptoms, note: row.check_in.note } : null,
  };
}
