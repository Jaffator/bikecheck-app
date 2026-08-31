import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq/dist/decorators/inject-queue.decorator';
import { Queue } from 'bullmq';
import { GeminiRideSummaryJob } from '../gemini/gemini.service';
import { NotificationService } from '../notification/notification.service';
import type { StravaGearResponse } from '@contracts/strava-gear.contract';
import type { PendingActivities } from '../notification/notification-types.config';
import axios from 'axios';
import { ResponseUnmatchedStravaGearDto } from './dto/response-strava-unmatched-gear.dto';
import { ResponsePendingStravaDto } from './dto/response-pending-strava.dto';
import type { strava_pending_activities } from '@prisma/client';
import { ResponseStravaAuthorizeUrlDto } from './dto/response-strava-authorize-url.dto';
import { GearLinkDto } from './dto/link-strava-gear.dto';

interface SplitMetricEntry {
  distance: number;
  elapsed_time: number;
  elevation_difference: number;
  moving_time: number;
  split: number;
  average_speed: number;
  average_grade_adjusted_speed: number;
  average_heartrate: number;
  pace_zone: number;
}

interface StravaActivityData {
  activity_id: number;
  athleteid: number;
  gearid: string | null;
  analyzedData: {
    rawJson: any;
    started_at: string;
    name: string;
    summary_polyline: string | null;
    suspension_minutes: number;
    health_index_brake_pad: number;
    drivetrain_km: number;
    distance_km: number;
    duration_min: number;
    elevation_up_m: number;
    elevation_down_m: number;
    speed_avg: number;
    max_speed_kmh: number;
  };
}

type SplitsMetric = Record<string, SplitMetricEntry>;

function getKslopeDH(slopePercent: number): number {
  if (slopePercent < 3) return 1;
  if (slopePercent < 8) return 1.2;
  if (slopePercent < 12) return 1.5;
  return 2;
}

function getKslopeUP(slopePercent: number): number {
  if (slopePercent >= 0 && slopePercent < 3) return 1;
  if (slopePercent < 6) return 1.2;
  if (slopePercent < 10) return 1.5;
  if (slopePercent >= 10) return 2;
  return 0;
}

@Injectable()
export class StravaEventsService {
  constructor(
    @InjectPinoLogger(StravaEventsService.name) private readonly logger: PinoLogger,
    @InjectQueue('gemini-queue') private readonly geminiQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Asks strava-service for an authorize URL for the logged-in user. The user id
   * is only ever passed over the internal call — the URL itself carries a random
   * state, so nothing the browser can edit identifies the account.
   */
  async buildAuthorizeUrl(userId: number): Promise<ResponseStravaAuthorizeUrlDto> {
    try {
      const response = await axios.post<ResponseStravaAuthorizeUrlDto>(
        `${process.env.STRAVA_SERVICE_URL}/strava/oauth-state`,
        { userId },
        {
          headers: { 'x-internal-secret': process.env.INTERNAL_API_SECRET },
          timeout: 5000,
        },
      );
      return { url: response.data.url };
    } catch (error) {
      throw new Error(`Failed to start Strava authorization: ${(error as Error).message}`);
    }
  }

  /**
   * Unlinks the user's Strava account. strava-service owns the tokens and the
   * revoke call, so it does that half; the user row here is what the frontend
   * reads to know whether an account is linked, so it is cleared afterwards.
   * Bikes keep their strava gear ids — reconnecting the same account then finds
   * them still linked instead of asking the user to pair everything again.
   */
  async disconnect(userId: number): Promise<void> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { strava_athlete_id: true },
    });

    if (!user?.strava_athlete_id) {
      throw new NotFoundException('No Strava account is linked to this user');
    }

    try {
      await axios.post(
        `${process.env.STRAVA_SERVICE_URL}/strava/disconnect`,
        { athleteId: Number(user.strava_athlete_id) },
        {
          headers: { 'x-internal-secret': process.env.INTERNAL_API_SECRET },
          timeout: 5000,
        },
      );
    } catch (error) {
      throw new Error(`Failed to disconnect Strava: ${(error as Error).message}`);
    }

    // The cached profile goes with the link — leaving a name behind would have
    // the app still showing an account it no longer has any claim to.
    await this.prisma.users.update({
      where: { id: userId },
      data: {
        strava_athlete_id: null,
        strava_firstname: null,
        strava_lastname: null,
        strava_username: null,
        strava_avatar_url: null,
      },
    });

    this.logger.info({ custom: true, userId, athleteId: user.strava_athlete_id }, 'Strava account unlinked');
  }

  async listUnmatchedStravaGear(userId: number): Promise<ResponseUnmatchedStravaGearDto> {
    // Resolve athleteId from the logged-in user, never trust it from the FE (IDOR).
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { strava_athlete_id: true },
    });

    // is_deleted is nullable, so rows written before the flag existed hold null:
    // "not: true" keeps those while still excluding the deleted ones.
    const bikes = await this.prisma.bikes.findMany({
      where: { user_id: userId, is_deleted: { not: true } },
    });
    if (!user?.strava_athlete_id) throw new Error('User has no linked Strava account');
    console.log('RESPONSEEEEEEEEEEEEEEE', `${process.env.STRAVA_SERVICE_URL}/strava/gear/${user.strava_athlete_id}`);
    console.log('INTERVAL API SECRET', process.env.INTERNAL_API_SECRET);

    try {
      const response = await axios.get<StravaGearResponse>(
        `${process.env.STRAVA_SERVICE_URL}/strava/gear/${user.strava_athlete_id}`,
        {
          headers: { 'x-internal-secret': process.env.INTERNAL_API_SECRET },
          timeout: 5000,
        },
      );
      const unmatchedGear: ResponseUnmatchedStravaGearDto = {
        user_id: userId,
        athlete_id: response.data.athlete_id,
        strava_bikes: response.data.bikes,
        bikecheck_bikes: bikes.map((bike) => ({
          id: bike.id,
          strava_gear_id: bike.strava_gear_id,
          bikename: bike.bikename,
          bike_brand: bike.bike_brand,
          bike_model: bike.bike_model,
          year: bike.year,
        })),
      };

      return unmatchedGear;
    } catch (error) {
      // Axios puts the status line in message and the service's own answer in
      // response.data — without the latter a 401 from the guard and a Strava
      // token failure look identical.
      if (axios.isAxiosError(error)) {
        this.logger.error(
          {
            custom: true,
            userId,
            athleteId: user.strava_athlete_id,
            status: error.response?.status,
            body: error.response?.data,
            code: error.code,
          },
          'Failed to fetch gear from strava-service',
        );
      } else {
        this.logger.error({ custom: true, userId, err: error }, 'Failed to fetch gear from strava-service');
      }
      throw new Error(`Failed to fetch gear from strava-service: ${(error as Error).message}`);
    }
  }

  /**
   * Links Strava bikes (gear ids) to the user's BikeCheck bikes in one transaction.
   */
  async linkStravaGear(userId: number, links: GearLinkDto[]): Promise<void> {
    // Interactive transaction so that throwing inside the callback rolls back
    // every update (all-or-nothing).
    await this.prisma.$transaction(async (tx) => {
      let updatedCount = 0;
      for (const link of links) {
        // Scope by user_id so a user can never link a bike they don't own (IDOR).
        const result = await tx.bikes.updateMany({
          where: { id: link.bikecheckBikeId, user_id: userId },
          data: { strava_gear_id: link.stravaBikeId ?? null },
        });
        updatedCount += result.count;
      }

      // Every link must have updated exactly one bike; otherwise some bike id
      // didn't exist or didn't belong to the user -> roll back the whole batch.
      if (updatedCount !== links.length) {
        this.logger.error({ custom: true, userId, links }, 'Failed to link Strava gear: not all bikes were updated');
        throw new NotFoundException('One or more bikes were not found for this user');
      }
    });
    await this.resolvePendingActivity_with_GearId(userId);
  }

  /**
   * Create analyze data from Strava activity.
   */
  async analyzeStravaData(stravaData: any): Promise<StravaActivityData> {
    const splitObj = stravaData.splits_metric as SplitsMetric;
    const user = await this.prisma.users.findFirst({
      where: { strava_athlete_id: String(stravaData.athlete.id) },
      select: { weight_kg: true },
    });
    const riderWeight = user?.weight_kg;
    const parameters = {
      kweight: Number(((riderWeight ?? 75) / 75).toFixed(2)),
      ksuspensionDown: 1,
      ksuspension: 0.2,
    };

    // Declare variables to store results
    let health_index_brake_pad = 0;
    let suspension_minutes = 0;
    let drivetrain_meters = 0;
    let total_elevation_loss = 0;

    // Anylyze splits data
    for (const key in splitObj) {
      const split = splitObj[key];
      const slopeSigned = split.distance ? (split.elevation_difference / split.distance) * 100 : 0;

      /*
        ------ Brake Wear index ------
        for moving downhill
       */
      if (slopeSigned < 0) {
        total_elevation_loss += Math.abs(split.elevation_difference);
        const slopePercentDown = Number(Math.abs(slopeSigned).toFixed(2));
        const splitIndexWear = split.elevation_difference * getKslopeDH(slopePercentDown) * parameters.kweight;
        health_index_brake_pad += Math.abs(splitIndexWear);
      }

      /*
      ------ Suspension Time ------
      */
      if (slopeSigned < 0) {
        // Downhill
        suspension_minutes += split.moving_time * parameters.ksuspensionDown;
      } else {
        // Flat or uphill
        suspension_minutes += Math.round(split.moving_time * parameters.ksuspension);
      }

      /*
      ------ Drivetrain Meters ------ 
      flat or uphill
       */
      if (slopeSigned >= 0) {
        // Uphill
        const slopePercentUP = Number(Math.abs(slopeSigned).toFixed(2));
        const drivetrainMeters = split.distance * getKslopeUP(slopePercentUP);
        drivetrain_meters += drivetrainMeters;
      }
    }
    const analyzedStravaData: StravaActivityData = {
      activity_id: stravaData.id,
      athleteid: stravaData.athlete.id,
      gearid: stravaData.gear?.id ?? null,
      analyzedData: {
        rawJson: stravaData,
        started_at: stravaData.start_date,
        name: stravaData.name,
        summary_polyline: stravaData.map?.summary_polyline ?? null,
        suspension_minutes: Math.floor(suspension_minutes / 60),
        health_index_brake_pad: Math.floor(health_index_brake_pad),
        drivetrain_km: Math.floor(drivetrain_meters / 1000),
        distance_km: Math.floor(stravaData.distance / 1000),
        duration_min: Math.floor(stravaData.moving_time / 60),
        elevation_up_m: Math.floor(stravaData.total_elevation_gain),
        elevation_down_m: Math.floor(total_elevation_loss),
        speed_avg: Number((stravaData.average_speed * 3.6).toFixed(2)),
        max_speed_kmh: Number((stravaData.max_speed * 3.6).toFixed(2)),
      },
    };
    return analyzedStravaData;
  }
  /**
   * Orchestrator: resolves user + bike from Strava data,
   * then either parks the activity as pending or saves it directly.
   */
  async saveAnalyzedData(data: StravaActivityData): Promise<{ message: string } | void> {
    // Lookup user and bike by Strava IDs
    const user = await this.prisma.users.findFirst({
      where: { strava_athlete_id: String(data.athleteid) },
      select: { id: true },
    });
    if (!user) throw new Error('User not found for Strava athlete ID: ' + data.athleteid);

    const bike = data.gearid
      ? await this.prisma.bikes.findFirst({
          where: { strava_gear_id: data.gearid, user_id: user.id },
          select: { id: true },
        })
      : null;

    const bikeId = bike ? Number(bike.id) : null;
    console.log('Resolved bikeId:', bikeId, 'for gearId:', data.gearid); // --- IGNORE ---
    // Bike not linked in BikeCheck — save activity to pending table
    if (bikeId === null) {
      // Strava can send both "create" and "update" events for the same activity
      // (or redeliver a webhook), so upsert instead of create to avoid a unique
      // constraint violation on activity_id.
      await this.prisma.strava_pending_activities.upsert({
        where: { activity_id: data.activity_id },
        create: {
          activity_id: data.activity_id,
          user_id: user.id,
          gear_id: data.gearid,
          analyzed_data: data.analyzedData,
        },
        update: {
          gear_id: data.gearid,
          analyzed_data: data.analyzedData,
        },
      });

      // Whether Strava sent no gear at all or gear that matches no bike here, the
      // user is left with the same job: say which bike it was. One notification
      // covers both — riders are not expected to keep gear tidy on Strava's side.
      // No dedup key: every ride is its own event and gets its own ask.
      await this.notificationService.create({
        userId: user.id,
        type: 'strava_activity_unassigned',
        payload: {
          activityId: String(data.activity_id),
          km: Math.round(data.analyzedData.distance_km),
          ...(data.analyzedData.name ? { activityName: data.analyzedData.name } : {}),
          ...(data.gearid ? { gearId: data.gearid } : {}),
        },
      });
      return { message: 'Not linked bike, activity saved to pending' };
    } else if (bikeId && user) {
      const result = await this.saveRide(bikeId, user.id, data.activity_id, data.analyzedData);
      // Only a ride the user has not been told about yet. An update webhook or a
      // re-sync runs the same upsert, and announcing those would report news
      // that already happened.
      if (result.isNew) {
        const bikeRow = await this.prisma.bikes.findUnique({
          where: { id: bikeId },
          select: { bike_brand: true, bike_model: true, year: true },
        });
        await this.notificationService.create({
          userId: user.id,
          type: 'strava_activity_saved',
          payload: {
            bikeId,
            km: Math.round(data.analyzedData.distance_km),
            bikeName: bikeRow ? [bikeRow.bike_brand, bikeRow.bike_model, bikeRow.year].filter(Boolean).join(' ') : '',
          },
        });
      }
      return { message: result.message };
    }
  }

  /**
   * The user's unresolved pending activities, newest first.
   */
  async listPendingActivities(userId: number): Promise<ResponsePendingStravaDto[]> {
    const pending = await this.prisma.strava_pending_activities.findMany({
      // Every unresolved ride, with or without a gear id: a gear that matches no
      // bike here leaves the user the same job as no gear at all, and the sheet
      // answers both the same way.
      where: { user_id: userId, resolved_at: null },
      orderBy: { created_at: 'desc' },
    });
    return pending.map((activity) => this.toPendingDto(activity));
  }

  /**
   * One pending activity, addressed the way a notification addresses it.
   */
  async getPendingActivity(userId: number, activityId: bigint): Promise<ResponsePendingStravaDto> {
    const pending = await this.prisma.strava_pending_activities.findFirst({
      where: { user_id: userId, activity_id: activityId, resolved_at: null },
    });
    if (!pending) throw new NotFoundException('Pending activity not found');
    return this.toPendingDto(pending);
  }

  // Lifts the ride's own figures out of the stored analysis, so the client gets
  // a flat row instead of the whole raw Strava blob.
  private toPendingDto(activity: strava_pending_activities): ResponsePendingStravaDto {
    const analyzed = activity.analyzed_data as StravaActivityData['analyzedData'];
    return {
      activity_id: String(activity.activity_id),
      gear_id: activity.gear_id,
      started_at: analyzed.started_at,
      // Rides stored before the name was lifted out still carry it in the raw
      // blob, so read that rather than showing them nameless.
      name: analyzed.name ?? (analyzed.rawJson?.name as string | undefined) ?? '',
      // Same fallback as the name: rides stored before the route was lifted out
      // still carry it in the raw blob. Null for rides recorded without GPS.
      summary_polyline:
        analyzed.summary_polyline ?? (analyzed.rawJson?.map?.summary_polyline as string | undefined) ?? null,
      distance_km: Math.round(analyzed.distance_km),
      duration_min: Math.round(analyzed.duration_min),
      elevation_up_m: Math.round(analyzed.elevation_up_m),
      created_at: activity.created_at,
    };
  }

  /**
   * Resolves pending activities that have no Strava gearId.
   * - If activityId is provided: assigns a single activity to the given bike.
   * - If activityId is omitted: assigns ALL pending activities without gearId to the given bike.
   */
  async resolvePendingActivities_noGear(params: PendingActivities): Promise<void> {
    if (params.activityId) {
      // Resolve only one selected activity
      // No gear_id filter: the user assigns the ride by hand either way, and a
      // ride parked against unknown gear is exactly one of the cases this is
      // for.
      const pending = await this.prisma.strava_pending_activities.findFirst({
        where: { user_id: params.userId, activity_id: params.activityId, resolved_at: null },
      });
      if (!pending) throw new NotFoundException('No pending activity found');

      const analyzedData = pending.analyzed_data as StravaActivityData['analyzedData'];
      await this.saveRide(params.bikeId, params.userId, Number(pending.activity_id), analyzedData);
      await this.prisma.strava_pending_activities.update({
        where: { id: pending.id },
        data: { resolved_at: new Date() },
      });
      // Only this activity's question has been answered.
      await this.notificationService.resolveActivityAsk(params.userId, String(pending.activity_id));
    } else {
      // Resolve all activities with no gearID
      const pending = await this.prisma.strava_pending_activities.findMany({
        where: { user_id: params.userId, gear_id: null, resolved_at: null },
      });
      for (const activity of pending) {
        const analyzedData = activity.analyzed_data as StravaActivityData['analyzedData'];
        await this.saveRide(params.bikeId, params.userId, Number(activity.activity_id), analyzedData);
        await this.prisma.strava_pending_activities.update({
          where: { id: activity.id },
          data: { resolved_at: new Date() },
        });
        // Every activity carries its own notification, so each has to be closed
        // on its own rather than by one shared key.
        await this.notificationService.resolveActivityAsk(params.userId, String(activity.activity_id));
      }
    }
  }
  /**
   * Called when user links a Strava gear to a BikeCheck bike in settings.
   * Matches all unresolved pending activities by gearId and saves them.
   */
  async resolvePendingActivity_with_GearId(userId: number): Promise<void> {
    const pending = await this.prisma.strava_pending_activities.findMany({
      where: { user_id: userId, resolved_at: null },
    });

    // Nothing to resolve -> skip the extra query and loops.
    if (pending.length === 0) return;

    const bikes = await this.prisma.bikes.findMany({
      where: { user_id: userId, is_deleted: { not: true } },
      select: { strava_gear_id: true, id: true },
    });

    // Try to solve all pending activities with matching gearID
    for (const bike of bikes) {
      if (!bike.strava_gear_id) continue;

      for (const activity of pending) {
        if (activity.gear_id === bike.strava_gear_id) {
          const analyzedData = activity.analyzed_data as StravaActivityData['analyzedData'];
          await this.saveRide(bike.id, userId, Number(activity.activity_id), analyzedData);
          await this.prisma.strava_pending_activities.update({
            where: { id: activity.id },
            data: { resolved_at: new Date() },
          });
          // Linking the gear answers the ask for every ride that was waiting on
          // it, one notification per ride.
          await this.notificationService.resolveActivityAsk(userId, String(activity.activity_id));
        }
      }
    }
  }

  /**
   * Persists a single ride and updates component wear counters.
   * Used by both saveAnalyzedData (live) and resolvePendingActivities (backfill).
   */
  private async saveRide(
    bikeId: number,
    userId: number,
    activityId: number,
    analyzedData: StravaActivityData['analyzedData'],
  ): Promise<{ message: string; isNew: boolean }> {
    // Fetch existing ride to compute diff and avoid double-counting on re-sync
    const existingRide = await this.prisma.rides.findUnique({
      where: { activity_strava_id: BigInt(activityId) },
      select: {
        distance_m: true,
        duration_min: true,
        drivetrain_meters: true,
        suspension_min: true,
        health_index_brake_pad: true,
        elevation_up_m: true,
      },
    });

    const ride = await this.prisma.rides.upsert({
      where: { activity_strava_id: BigInt(activityId) },
      create: {
        bike_id: bikeId,
        user_id: userId,
        started_at: new Date(analyzedData.started_at),
        json_data: JSON.stringify(analyzedData.rawJson),
        health_index_brake_pad: analyzedData.health_index_brake_pad,
        activity_strava_id: BigInt(activityId),
        distance_m: analyzedData.distance_km * 1000,
        duration_min: analyzedData.duration_min,
        elevation_up_m: analyzedData.elevation_up_m,
        elevation_down_m: analyzedData.elevation_down_m,
        speed_avg: analyzedData.speed_avg,
        max_speed_kmh: analyzedData.max_speed_kmh,
        suspension_min: analyzedData.suspension_minutes,
        drivetrain_meters: analyzedData.drivetrain_km * 1000,
      },
      update: {
        started_at: new Date(analyzedData.started_at),
        json_data: JSON.stringify(analyzedData.rawJson),
        health_index_brake_pad: analyzedData.health_index_brake_pad,
        distance_m: analyzedData.distance_km * 1000,
        duration_min: analyzedData.duration_min,
        elevation_up_m: analyzedData.elevation_up_m,
        elevation_down_m: analyzedData.elevation_down_m,
        speed_avg: analyzedData.speed_avg,
        max_speed_kmh: analyzedData.max_speed_kmh,
        suspension_min: analyzedData.suspension_minutes,
        drivetrain_meters: analyzedData.drivetrain_km * 1000,
      },
    });

    const diff = existingRide
      ? {
          total_km: analyzedData.distance_km - Math.floor((existingRide.distance_m ?? 0) / 1000),
          duration_min: analyzedData.duration_min - (existingRide.duration_min ?? 0),
          drivetrain_km: analyzedData.drivetrain_km - Math.floor((existingRide.drivetrain_meters ?? 0) / 1000),
          suspension_min: analyzedData.suspension_minutes - (existingRide.suspension_min ?? 0),
          health_index_brake_pad: analyzedData.health_index_brake_pad - (existingRide.health_index_brake_pad ?? 0),
          elevation_up_m: analyzedData.elevation_up_m - (existingRide.elevation_up_m ?? 0),
        }
      : {
          total_km: analyzedData.distance_km,
          duration_min: analyzedData.duration_min,
          drivetrain_km: analyzedData.drivetrain_km,
          suspension_min: analyzedData.suspension_minutes,
          health_index_brake_pad: analyzedData.health_index_brake_pad,
          elevation_up_m: analyzedData.elevation_up_m,
        };

    await this.prisma.components_mounted.updateMany({
      where: {
        bike_id: bikeId,
        is_deleted: false,
        component_types: { component_type: { in: ['Shock', 'Fork'] } },
      },
      data: { suspension_min: { increment: diff.suspension_min } },
    });

    await this.prisma.components_mounted.updateMany({
      where: { bike_id: bikeId, is_deleted: false, component_types: { component_type: 'Brake pad' } },
      data: { health_index: { increment: diff.health_index_brake_pad } },
    });

    await this.prisma.components_mounted.updateMany({
      where: { bike_id: bikeId, is_deleted: false },
      data: { total_km: { increment: diff.total_km }, total_time_min: { increment: diff.duration_min } },
    });

    await this.prisma.components_mounted.updateMany({
      where: { bike_id: bikeId, is_deleted: false },
      data: { drivetrain_km: { increment: diff.drivetrain_km } },
    });

    // The bike's own climbing, which nothing else accumulates - the readings above belong
    // to the components mounted on it. Only ever moved by the difference, so re-syncing a
    // ride does not count its metres twice. Never backfilled: a bike ridden before this
    // existed reads lower than it has actually climbed.
    await this.prisma.bikes.update({
      where: { id: bikeId },
      data: { total_elevation_m: { increment: Math.round(diff.elevation_up_m) } },
    });

    await this.geminiQueue.add('generate-ride-summary', {
      data: analyzedData,
      rideId: ride.id,
    } satisfies GeminiRideSummaryJob);
    // Callers announce a first-time ride and stay quiet about a re-sync, so the
    // upsert has to say which of the two it just did.
    return { message: 'Ride saved and summary generation queued', isNew: existingRide === null };
  }

  async deleteStravaActivity(stravaData: any) {
    const user = await this.prisma.users.findFirst({
      where: { strava_athlete_id: String(stravaData.owner_id) },
      select: { id: true },
    });
    if (!user) throw new Error('User not found for Strava athlete ID: ' + stravaData.owner_id);
    await this.prisma.rides.delete({
      where: { activity_strava_id: BigInt(stravaData.object_id) },
    });
    this.logger.info({ custom: true, user: user.id }, 'Strava activity deleted');
  }
  // The profile fields are a snapshot: Strava sends them with the token, so they
  // are written here and refreshed only if the user links the account again.
  // Optional so a job queued before they existed still processes.
  async accountLinked(data: {
    athlete_id: number;
    user_id: string;
    firstname?: string | null;
    lastname?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  }): Promise<void> {
    await this.prisma.users.update({
      where: { id: Number(data.user_id) },
      data: {
        strava_athlete_id: String(data.athlete_id),
        strava_firstname: data.firstname ?? null,
        strava_lastname: data.lastname ?? null,
        strava_username: data.username ?? null,
        // Strava's own picture. users.avatar_url is the app avatar, never touched.
        strava_avatar_url: data.avatar_url ?? null,
      },
    });
    this.logger.info({ custom: true, userId: data.user_id, athleteId: data.athlete_id }, 'Strava account linked');
  }
}
