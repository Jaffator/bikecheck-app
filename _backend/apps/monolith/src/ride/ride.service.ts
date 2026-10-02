import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { check_in_status, Prisma, type strava_pending_activities } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ownedBikeWhere } from '../bike/owned-bike.where';
import { ServiceTrackingService, type WearPreview } from '../service-tracking/service-tracking.service';
import {
  BRAKE_PAD_PART,
  carried,
  DRIVETRAIN_PARTS,
  mountedPartsWhere,
  SUSPENSION_PARTS,
  wearRideSelect,
  type WearRide,
} from '../service-tracking/ride-wear';
import type { Response_WoreOffLineDto } from '../service-tracking/dto/response-wore-off-line';
import type { Response_BikeWoreOffDto } from '../service-tracking/dto/response-bike-wore-off';
import type { StravaActivityData } from '../strava/strava.service';
import { analysisOf, pendingWear, toPendingDto } from '../strava/pending-activity';
import {
  ResponseCheckInPendingDto,
  ResponseCheckInPromptDto,
  ResponseCheckInRideDto,
  ResponseRideCheckInDto,
  ResponseRideDto,
  ResponseRidePageDto,
} from './dto/response-ride.dto';
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
  created_at?: Date | null;
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
   * What the check-in drawer walks: rides arrived since it last opened and still without a check-in,
   * and recent rides waiting for a bike. Nothing at all until one of either has arrived.
   */
  async findCheckInPrompt(userId: number, now: Date = new Date()): Promise<ResponseCheckInPromptDto> {
    const since = promptSince(now);
    const user = await this.prisma.users.findUnique({ where: { id: userId }, select: { check_in_prompted_at: true } });
    const rows = await this.prisma.rides.findMany({
      where: { ...listedRidesWhere(userId), started_at: { gte: since } },
      orderBy: { started_at: 'desc' },
      include: { bikes: { select: BIKE_SELECT }, check_in: { select: CHECK_IN_SELECT } },
    });
    // Resolved rows too: they date the rides assigned from them. Arrived before it started is
    // impossible, so the arrival bound narrows the read safely.
    const pendingRows = await this.prisma.strava_pending_activities.findMany({
      where: { user_id: userId, created_at: { gte: since } },
      orderBy: { created_at: 'desc' },
    });
    const waiting = waitingForBike(pendingRows, since);

    const recent = rows.filter((row) => row.started_at !== null && row.started_at >= since);
    const promptedAt = user?.check_in_prompted_at ?? null;
    const arrivals = [...recent.map((row) => arrivedAt(row, pendingRows)), ...waiting.map((row) => row.created_at)];
    if (!arrivals.some((arrived) => arrivedAfterPrompt(arrived, promptedAt))) return { rides: [], pending: [] };

    // The check-in is optional, so a ride with a bike is offered once; only a missing bike comes back.
    const offered = recent.filter(
      (row) => row.check_in === null && arrivedAfterPrompt(arrivedAt(row, pendingRows), promptedAt),
    );
    if (offered.length === 0 && waiting.length === 0) return { rides: [], pending: [] };

    const [woreOff, preview] = await Promise.all([
      this.serviceTracking.getWoreOff(userId, offered),
      this.serviceTracking.getWearPreview(userId),
    ]);
    return {
      rides: (offered as OfferedRide[]).map((row) => toCheckInRideDto(row, woreOff.get(row.id) ?? [], preview)),
      pending: waiting.map((row) => toCheckInPendingDto(row, preview)),
    };
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

  /**
   * Moves a ride to another of the user's bikes, taking its wear off the parts that carried it
   * and putting it on the parts the new bike had mounted at the time.
   */
  async changeBike(userId: number, rideId: number, bikeId: number): Promise<void> {
    const ride = await this.prisma.rides.findFirst({
      where: movableRideWhere(userId, rideId),
      select: movedRideSelect,
    });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.bike_id === bikeId) return;

    const target = await this.prisma.bikes.findFirst({ where: ownedBikeWhere(bikeId, userId), select: { id: true } });
    if (!target) throw new NotFoundException('Bike not found');

    await this.prisma.$transaction(async (tx) => {
      await shiftWear(tx, ride.bike_id, ride, -1);
      await shiftWear(tx, bikeId, ride, 1);
      await tx.rides.update({ where: { id: ride.id }, data: { bike_id: bikeId } });
    });

    // One bike's readings dropped and the other's grew, so both may cross a band.
    await this.serviceTracking.evaluateBikes([ride.bike_id, bikeId], userId);
  }

  /**
   * Removes a ride that was on none of the user's bikes: its wear comes off its bike, the way a
   * bike change takes it off.
   */
  async dismiss(userId: number, rideId: number): Promise<void> {
    const ride = await this.prisma.rides.findFirst({
      where: movableRideWhere(userId, rideId),
      select: dismissedRideSelect,
    });
    if (!ride) throw new NotFoundException('Ride not found');

    await this.prisma.$transaction(async (tx) => {
      await shiftWear(tx, ride.bike_id, ride, -1);
      // Hard, not soft: a soft-deleted ride would still be found when Strava sends the activity again.
      await tx.rides.delete({ where: { id: ride.id } });
      if (ride.activity_strava_id !== null) {
        await markDismissed(tx, userId, ride.activity_strava_id, pendingAnalysisOf(ride));
      }
    });

    await this.serviceTracking.evaluateBikes([ride.bike_id], userId);
  }

  /** Removes a ride whose activity was deleted on Strava, with its wear. A ride already gone is no error. */
  async removeStravaRide(userId: number, activityId: bigint): Promise<void> {
    const ride = await this.prisma.rides.findFirst({
      where: { activity_strava_id: activityId, user_id: userId, is_deleted: { not: true } },
      select: { ...movedRideSelect, bikes: { select: { is_deleted: true } } },
    });
    if (!ride) return;

    // An Archived Bike is never written to (ADR 0024): the ride goes, its wear stays frozen.
    if (ride.bikes.is_deleted === true) {
      await this.prisma.rides.delete({ where: { id: ride.id } });
      return;
    }

    // No dismissed mark: Strava will never send a deleted activity again.
    await this.prisma.$transaction(async (tx) => {
      await shiftWear(tx, ride.bike_id, ride, -1);
      await tx.rides.delete({ where: { id: ride.id } });
    });

    await this.serviceTracking.evaluateBikes([ride.bike_id], userId);
  }
}

// Only a ride the lists show may move its wear: an Archived Bike is never written to (ADR 0024).
function movableRideWhere(userId: number, rideId: number): Prisma.ridesWhereInput {
  return { id: rideId, ...listedRidesWhere(userId) };
}

const movedRideSelect = { ...wearRideSelect, elevation_up_m: true } satisfies Prisma.ridesSelect;
type MovedRide = WearRide & { elevation_up_m: number | null };

const wornPartSelect = {
  id: true,
  mounted_at: true,
  total_km: true,
  total_time_min: true,
  drivetrain_km: true,
  suspension_min: true,
  health_index: true,
  component_types: { select: { component_type: true } },
} satisfies Prisma.components_mountedSelect;
type WornPart = Prisma.components_mountedGetPayload<{ select: typeof wornPartSelect }>;

// Adds (sign 1) or removes (sign -1) the ride's wear on one bike, never below zero.
async function shiftWear(tx: Prisma.TransactionClient, bikeId: number, ride: MovedRide, sign: 1 | -1): Promise<void> {
  const parts = await tx.components_mounted.findMany({ where: mountedPartsWhere(bikeId), select: wornPartSelect });
  for (const part of parts.filter((one) => carried(one, ride))) {
    await tx.components_mounted.update({ where: { id: part.id }, data: partWear(part, ride, sign) });
  }

  const bike = await tx.bikes.findUnique({ where: { id: bikeId }, select: { total_elevation_m: true } });
  await tx.bikes.update({
    where: { id: bikeId },
    data: { total_elevation_m: shifted(bike?.total_elevation_m, Math.round(ride.elevation_up_m ?? 0), sign) },
  });
}

// The same columns, per part kind, that saveRide grows in strava.service.ts.
function partWear(part: WornPart, ride: MovedRide, sign: 1 | -1): Prisma.components_mountedUpdateInput {
  const type = part.component_types.component_type;
  return {
    total_km: shifted(part.total_km, Math.floor((ride.distance_m ?? 0) / 1000), sign),
    total_time_min: shifted(part.total_time_min, ride.duration_min ?? 0, sign),
    ...(DRIVETRAIN_PARTS.includes(type)
      ? { drivetrain_km: shifted(part.drivetrain_km, Math.floor((ride.drivetrain_meters ?? 0) / 1000), sign) }
      : {}),
    ...(SUSPENSION_PARTS.includes(type)
      ? { suspension_min: shifted(part.suspension_min, ride.suspension_min ?? 0, sign) }
      : {}),
    ...(type === BRAKE_PAD_PART
      ? { health_index: shifted(part.health_index, ride.health_index_brake_pad ?? 0, sign) }
      : {}),
  };
}

function shifted(current: number | null | undefined, amount: number, sign: 1 | -1): number {
  return Math.max(0, (current ?? 0) + sign * amount);
}

const dismissedRideSelect = {
  ...movedRideSelect,
  activity_strava_id: true,
  json_data: true,
  elevation_down_m: true,
  speed_avg: true,
  max_speed_kmh: true,
  descent_min: true,
} satisfies Prisma.ridesSelect;
type DismissedRide = Prisma.ridesGetPayload<{ select: typeof dismissedRideSelect }>;
type PendingAnalysis = StravaActivityData['analyzedData'];

// Resolved with no ride is what the Strava webhook and sync read as dismissed.
async function markDismissed(
  tx: Prisma.TransactionClient,
  userId: number,
  activityId: bigint,
  analysis: PendingAnalysis,
): Promise<void> {
  const now = new Date();
  await tx.strava_pending_activities.upsert({
    where: { activity_id: activityId },
    create: { activity_id: activityId, user_id: userId, analyzed_data: analysis, resolved_at: now },
    update: { resolved_at: now },
  });
}

// The analysis Strava parks a pending activity with, rebuilt from the saved ride (the inverse of saveRide).
function pendingAnalysisOf(ride: DismissedRide): PendingAnalysis {
  const rawJson = asActivity(ride.json_data);
  const facts = activityFacts(rawJson);
  return {
    rawJson,
    // A Strava ride is always saved with its start; the fallback only satisfies the type.
    started_at: ride.started_at?.toISOString() ?? '',
    name: facts.name,
    summary_polyline: facts.summary_polyline,
    suspension_minutes: ride.suspension_min ?? 0,
    health_index_brake_pad: ride.health_index_brake_pad ?? 0,
    descent_min: ride.descent_min ?? undefined,
    drivetrain_km: (ride.drivetrain_meters ?? 0) / 1000,
    distance_km: (ride.distance_m ?? 0) / 1000,
    duration_min: ride.duration_min ?? 0,
    elevation_up_m: ride.elevation_up_m ?? 0,
    elevation_down_m: ride.elevation_down_m ?? 0,
    speed_avg: ride.speed_avg ?? 0,
    max_speed_kmh: ride.max_speed_kmh ?? 0,
  };
}

// The user's rides the lists show: not deleted, and not on an Archived Bike (ADR 0024).
function listedRidesWhere(userId: number): Prisma.ridesWhereInput {
  return { user_id: userId, is_deleted: { not: true }, bikes: { is_deleted: { not: true } } };
}

function promptSince(now: Date): Date {
  return new Date(now.getTime() - CHECK_IN_PROMPT_DAYS * DAY_MS);
}

// Unresolved and started in the window; a backfill lands now but may have been ridden long ago.
function waitingForBike(rows: strava_pending_activities[], since: Date): strava_pending_activities[] {
  return rows.filter((row) => row.resolved_at === null && new Date(analysisOf(row).started_at) >= since);
}

// A ride assigned from Pending reached BikeCheck when its pending row did, not when it was assigned.
function arrivedAt(
  ride: { activity_strava_id: bigint | null; created_at: Date | null },
  pendingRows: { activity_id: bigint; created_at: Date }[],
): Date | null {
  const parked = pendingRows.find(
    (row) => ride.activity_strava_id !== null && row.activity_id === ride.activity_strava_id,
  );
  return parked?.created_at ?? ride.created_at;
}

// Reached BikeCheck after the drawer last opened; a drawer never opened takes all.
function arrivedAfterPrompt(arrived: Date | null, promptedAt: Date | null): boolean {
  return promptedAt === null || (arrived !== null && arrived > promptedAt);
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
// the blob is large, and parsing it once per question is the cost this endpoint is
// trying to avoid.
interface ActivityFacts {
  name: string;
  summary_polyline: string | null;
  sport_type: string | null;
}

interface StravaActivity {
  name?: unknown;
  map?: { summary_polyline?: unknown } | null;
  sport_type?: unknown;
}

// The title, the route and the sport type, read out of the stored payload. It is written with
// JSON.stringify, but Prisma hands a Json column back parsed, so both shapes are
// accepted rather than assuming either. Strava always sends a name, so the empty
// string is a type-level floor, not an expected state; the route is genuinely
// absent for a ride recorded without GPS.
function activityFacts(jsonData: unknown): ActivityFacts {
  const activity = asActivity(jsonData);
  const name = activity?.name;
  const polyline = activity?.map?.summary_polyline;
  const sportType = activity?.sport_type;

  return {
    name: typeof name === 'string' ? name : '',
    summary_polyline: typeof polyline === 'string' && polyline.length > 0 ? polyline : null,
    sport_type: typeof sportType === 'string' && sportType.length > 0 ? sportType : null,
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
  const parts = [bike.bike_brand, bike.bike_model, bike.year].filter((part): part is string | number => Boolean(part));
  return parts.length > 0 ? parts.join(' ') : null;
}

type OfferedRide = RideRow & WearRide;

function toCheckInRideDto(
  row: OfferedRide,
  woreOff: Response_WoreOffLineDto[],
  preview: WearPreview,
): ResponseCheckInRideDto {
  return { ...toRideDto(row, woreOff), wore_off_by_bike: woreOffByBike(row, woreOff, preview) };
}

function toCheckInPendingDto(row: strava_pending_activities, preview: WearPreview): ResponseCheckInPendingDto {
  return { ...toPendingDto(row), wore_off_by_bike: preview(pendingWear(row)) };
}

// The ride is already in its own bike's reading, so that bike keeps its wore_off; every other bike gets the preview.
function woreOffByBike(
  ride: WearRide,
  woreOff: Response_WoreOffLineDto[],
  preview: WearPreview,
): Response_BikeWoreOffDto[] {
  const elsewhere = preview(ride).filter((bike) => bike.bike_id !== ride.bike_id);
  return [{ bike_id: ride.bike_id, wore_off: woreOff }, ...elsewhere];
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
    sport_type: facts.sport_type,
    created_at: row.created_at ? row.created_at.toISOString() : null,
    wore_off: woreOff,
    check_in: row.check_in
      ? { status: row.check_in.status, symptoms: row.check_in.symptoms, note: row.check_in.note }
      : null,
  };
}
