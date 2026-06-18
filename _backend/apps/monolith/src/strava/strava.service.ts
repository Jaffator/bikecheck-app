import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq/dist/decorators/inject-queue.decorator';
import { Queue } from 'bullmq';
import { GeminiRideSummaryJob } from '../gemini/gemini.service';
import { NotificationService } from '../notification/notification.service';
import type { StravaGearResponse } from '@contracts/strava-gear.contract';
import type { PendingActivities } from '../notification/notification-types.config';
import axios from 'axios';

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

  async listUnmatchedStravaGear(userId: number): Promise<StravaGearResponse> {
    // Resolve athleteId from the logged-in user, never trust it from the FE (IDOR).
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { strava_athlete_id: true },
    });
    if (!user?.strava_athlete_id) throw new Error('User has no linked Strava account');
    console.log('USER', user);
    try {
      const response = await axios.get<StravaGearResponse>(
        `${process.env.STRAVA_SERVICE_URL}/strava/gear/${user.strava_athlete_id}`,
        {
          headers: { 'x-internal-secret': process.env.INTERNAL_API_SECRET },
          timeout: 5000,
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch gear from strava-service: ${(error as Error).message}`);
    }
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

      // No gearID in Strava activity -> send notification -> user must link activity with bike
      if (!data.gearid) {
        await this.notificationService.create({
          userId: user.id,
          type: 'strava_no_gear',
          title: 'Strava activity without a bike(gearID)',
          body: 'Assign a bike to this activity directly in the Strava app.',
          dedupKey: `strava_no_gear:${user.id}`,
        });
      } else {
        // No matching bike in BikeCheck -> send notification -> user must link the gear with bike
        await this.notificationService.create({
          userId: user.id,
          type: 'strava_unmatched_gear',
          title: 'Strava bike(gearID) not linked with bike in BikeCheck',
          body: 'Link your Strava bike to a BikeCheck bike in settings.',
          payload: { gearId: data.gearid },
          dedupKey: `strava_unmatched_gear:${data.gearid}`,
        });
      }
      return { message: 'Not linked bike, activity saved to pending' };
    } else if (bikeId && user) {
      const result = await this.saveRide(bikeId, user.id, data.activity_id, data.analyzedData);
      return { message: result.message };
    }
  }

  /**
   * Resolves pending activities that have no Strava gearId.
   * - If activityId is provided: assigns a single activity to the given bike.
   * - If activityId is omitted: assigns ALL pending activities without gearId to the given bike.
   */
  async resolvePendingActivities_noGear(params: PendingActivities): Promise<void> {
    if (params.activityId) {
      // Resolve only one selected activity
      const pending = await this.prisma.strava_pending_activities.findFirst({
        where: { user_id: params.userId, activity_id: params.activityId, resolved_at: null, gear_id: null },
      });
      if (!pending) throw new Error('No pending activity found');

      const analyzedData = pending.analyzed_data as StravaActivityData['analyzedData'];
      await this.saveRide(params.bikeId, params.userId, Number(pending.activity_id), analyzedData);
      await this.prisma.strava_pending_activities.update({
        where: { id: pending.id },
        data: { resolved_at: new Date() },
      });
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
      }
    }

    // Dismiss the "strava_no_gear" notification for this gear
    await this.notificationService.resolveByDedupKey(params.userId, `strava_no_gear:${params.userId}`);
  }
  /**
   * Called when user links a Strava gear to a BikeCheck bike in settings.
   * Matches all unresolved pending activities by gearId and saves them.
   */
  async resolvePendingActivity_with_GearId(userId: number): Promise<void> {
    const pending = await this.prisma.strava_pending_activities.findMany({
      where: { user_id: userId, resolved_at: null },
    });

    const bikes = await this.prisma.bikes.findMany({
      where: { user_id: userId },
      select: { strava_gear_id: true, id: true },
    });

    // Try to solve all pending activities with matching gearID
    for (const bike of bikes) {
      if (!bike.strava_gear_id) continue;

      let matched = false;
      for (const activity of pending) {
        if (activity.gear_id === bike.strava_gear_id) {
          const analyzedData = activity.analyzed_data as StravaActivityData['analyzedData'];
          await this.saveRide(bike.id, userId, Number(activity.activity_id), analyzedData);
          await this.prisma.strava_pending_activities.update({
            where: { id: activity.id },
            data: { resolved_at: new Date() },
          });
          matched = true;
        }
      }

      // Dismiss notification only if at least one activity was resolved
      if (matched) {
        await this.notificationService.resolveByDedupKey(userId, `strava_unmatched_gear:${bike.strava_gear_id}`);
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
  ): Promise<{ message: string }> {
    // Fetch existing ride to compute diff and avoid double-counting on re-sync
    const existingRide = await this.prisma.rides.findUnique({
      where: { activity_strava_id: BigInt(activityId) },
      select: {
        distance_m: true,
        duration_min: true,
        drivetrain_meters: true,
        suspension_min: true,
        health_index_brake_pad: true,
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
        }
      : {
          total_km: analyzedData.distance_km,
          duration_min: analyzedData.duration_min,
          drivetrain_km: analyzedData.drivetrain_km,
          suspension_min: analyzedData.suspension_minutes,
          health_index_brake_pad: analyzedData.health_index_brake_pad,
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

    await this.geminiQueue.add('generate-ride-summary', {
      data: analyzedData,
      rideId: ride.id,
    } satisfies GeminiRideSummaryJob);
    return { message: 'Ride saved and summary generation queued' };
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
  async accountLinked(data: { athlete_id: number; user_id: string }): Promise<void> {
    await this.prisma.users.update({
      where: { id: Number(data.user_id) },
      data: { strava_athlete_id: String(data.athlete_id) },
    });
    this.logger.info({ custom: true, userId: data.user_id, athleteId: data.athlete_id }, 'Strava account linked');
  }
}
