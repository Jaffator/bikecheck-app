import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq/dist/decorators/inject-queue.decorator';
import { Queue } from 'bullmq';
import { GeminiRideSummaryJob } from '../gemini/gemini.service';

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
  gearid: string;
  analyzedData: {
    rawJson: any;
    started_at: string;
    suspension_minutes: number;
    health_index_brake_pad: number;
    drivetrain_meters: number;
    distance_m: number;
    duration_min: number;
    elevation_up_m: number;
    elevation_down_m: number;
    speed_avg: number;
    max_speed_kmh: number;
  };
}

type SplitsMetric = Record<string, SplitMetricEntry>;

@Injectable()
export class StravaEventsService {
  constructor(
    @InjectPinoLogger(StravaEventsService.name) private readonly logger: PinoLogger,
    @InjectQueue('gemini-queue') private readonly geminiQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create analyze data from Strava activity.
   */
  async analyzeStravaData(stravaData: any): Promise<StravaActivityData> {
    const splitObj = stravaData.splits_metric as SplitsMetric;
    const { weight_kg: riderWeight } = (await this.prisma.users.findFirst({
      where: { strava_athlete_id: String(stravaData.athlete.id) },
      select: { weight_kg: true },
    })) ?? { weight_kg: 75 };
    const parameters = {
      kweight: Number((riderWeight! / 75).toFixed(2)),
      ksuspensionDown: 1,
      ksuspension: 0.2,
    };

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
      if (slopePercent > 10) return 2;
      return 0;
    }
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
      if (slopeSigned > 0) {
        // Uphill
        const slopePercentUP = Number(Math.abs(slopeSigned).toFixed(2));
        const drivetrainMeters = split.distance * getKslopeUP(slopePercentUP);
        drivetrain_meters += drivetrainMeters;
      }
    }
    const analyzedStravaData: StravaActivityData = {
      activity_id: stravaData.id,
      athleteid: stravaData.athlete.id,
      gearid: stravaData.gear.id,
      analyzedData: {
        rawJson: stravaData,
        started_at: stravaData.start_date,
        suspension_minutes: Math.floor(suspension_minutes / 60),
        health_index_brake_pad: Math.floor(health_index_brake_pad),
        drivetrain_meters: Math.floor(drivetrain_meters),
        distance_m: Math.floor(stravaData.distance),
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
   * Save analyzed Strava activity data and saves the result to the rides.
   */
  async saveAnalyzedData(data: StravaActivityData): Promise<void> {
    const bike = await this.prisma.bikes.findFirst({
      where: {
        strava_gear_id: data.gearid,
        users: { strava_athlete_id: String(data.athleteid) },
      },
      select: { id: true, user_id: true },
    });
    const bikeId = bike ? Number(bike.id) : null;
    const userId = bike ? Number(bike.user_id) : null;

    // Save data to db - Rides table
    if (bikeId && userId) {
      const ride = await this.prisma.rides.upsert({
        where: { activity_strava_id: BigInt(data.activity_id) },
        create: {
          bike_id: bikeId,
          user_id: userId,
          started_at: new Date(data.analyzedData.started_at),
          json_data: JSON.stringify(data.analyzedData.rawJson),
          health_index: data.analyzedData.health_index_brake_pad,
          activity_strava_id: BigInt(data.activity_id),
          distance_m: data.analyzedData.distance_m,
          duration_min: data.analyzedData.duration_min,
          elevation_up_m: data.analyzedData.elevation_up_m,
          elevation_down_m: data.analyzedData.elevation_down_m,
          speed_avg: data.analyzedData.speed_avg,
          max_speed_kmh: data.analyzedData.max_speed_kmh,
          suspension_min: data.analyzedData.suspension_minutes,
          drivetrain_meters: data.analyzedData.drivetrain_meters,
        },
        update: {
          started_at: new Date(data.analyzedData.started_at),
          json_data: JSON.stringify(data.analyzedData.rawJson),
          health_index: data.analyzedData.health_index_brake_pad,
          distance_m: data.analyzedData.distance_m,
          duration_min: data.analyzedData.duration_min,
          elevation_up_m: data.analyzedData.elevation_up_m,
          elevation_down_m: data.analyzedData.elevation_down_m,
          speed_avg: data.analyzedData.speed_avg,
          max_speed_kmh: data.analyzedData.max_speed_kmh,
          suspension_min: data.analyzedData.suspension_minutes,
          drivetrain_meters: data.analyzedData.drivetrain_meters,
        },
      });

      // Save data to db - Components_mounted table

      /* --- health_index_brake_pad parameter --- 
        - health_index parameter in table
          - releated to Brake pads
          - (posible other parts will have health index too)
      */
      console.log(bikeId);
      const { count: brakepads_Count } = await this.prisma.components_mounted.updateMany({
        where: {
          bike_id: bikeId,
          is_deleted: false,
          component_types: { component_type: 'Brake pad' },
        },
        data: { health_index: { increment: data.analyzedData.health_index_brake_pad } },
      });

      /* --- distance_m parameter ---
          - total_meters parameter in table
            - releated to all coponents
      */
      const { count: total_metersCount } = await this.prisma.components_mounted.updateMany({
        where: {
          bike_id: bikeId,
          is_deleted: false,
        },
        data: { total_meters: { increment: data.analyzedData.distance_m } },
      });

      /* --- duration_min parameter ---
          - total_time_min parameter in table
            - releated to all coponents
      */
      const { count: total_time_minCount } = await this.prisma.components_mounted.updateMany({
        where: {
          bike_id: bikeId,
          is_deleted: false,
        },
        data: { total_time_min: { increment: data.analyzedData.duration_min } },
      });

      /* --- drivetrain_meters parameter ---
          - drivetrain_meters parameter in table
          - releated to chain, cassette, chainring
      */
      const { count: total_time_minCount } = await this.prisma.components_mounted.updateMany({
        where: {
          bike_id: bikeId,
          is_deleted: false,
        },
        data: { total_time_min: { increment: data.analyzedData.duration_min } },
      });

      if (brakepads_Count === 0) throw new Error('Cannot update health_index');
      if (total_metersCount === 0) throw new Error('Cannot update total_meters');
      if (total_time_minCount === 0) throw new Error('Cannot update total_time_min');

      // Generate ride summary
      await this.geminiQueue.add('generate-ride-summary', { data, rideId: ride.id } satisfies GeminiRideSummaryJob);
    }
  }

  async accountLinked(data: { athlete_id: number; user_id: string }): Promise<void> {
    await this.prisma.users.update({
      where: { id: Number(data.user_id) },
      data: { strava_athlete_id: String(data.athlete_id) },
    });
    this.logger.info({ custom: true, userId: data.user_id, athleteId: data.athlete_id }, 'Strava account linked');
  }
  // async activityUpdated(data: unknown): Promise<void> {
  //   this.logger.info({ custom: true, data }, 'Strava activity updated');
  //   // TODO:
  // }

  // async activityDeleted(data: unknown): Promise<void> {
  //   this.logger.info({ custom: true, data }, 'Strava activity deleted');
  //   // TODO:
  // }
}
