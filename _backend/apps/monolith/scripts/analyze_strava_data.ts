/* eslint-disable @typescript-eslint/no-unsafe-call */
import stravaData from './simplified_strava_data.json';

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

export type SplitsMetric = Record<string, SplitMetricEntry>;

function analyzeStravaData(data: any, riderWeight: number) {
  const splitObj = data.splits_metric as SplitsMetric;

  const parameters = {
    kweight: Number((riderWeight / 75).toFixed(2)),
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
  let brake_indexWear = 0;
  let suspension_minutes = 0;
  let drivetrain_meters = 0;

  // Anylyze splits data
  for (const key in splitObj) {
    const split = splitObj[key];
    const slopeSigned = split.distance ? (split.elevation_difference / split.distance) * 100 : 0;
    // --- Brake Wear index ---
    // Only data for moving downhill
    if (slopeSigned < 0) {
      const slopePercentDown = Number(Math.abs(slopeSigned).toFixed(2));
      const splitIndexWear = split.elevation_difference * getKslopeDH(slopePercentDown) * parameters.kweight;
      brake_indexWear += Math.abs(splitIndexWear);
    }
    // --- Suspension Time ---
    if (slopeSigned < 0) {
      // Downhill
      suspension_minutes += split.moving_time * parameters.ksuspensionDown;
    } else {
      // Flat or uphill
      suspension_minutes += Math.round(split.moving_time * parameters.ksuspension);
    }
    // --- Drivetrain Meters - flat or uphill ---
    if (slopeSigned > 0) {
      // Uphill
      const slopePercentUP = Number(Math.abs(slopeSigned).toFixed(2));
      const drivetrainMeters = split.distance * getKslopeUP(slopePercentUP);
      drivetrain_meters += drivetrainMeters;
    }
  }
  suspension_minutes = Math.floor(suspension_minutes / 60);
  brake_indexWear = Math.floor(brake_indexWear);
  drivetrain_meters = Math.floor(drivetrain_meters);
  return {
    suspension_minutes,
    brake_indexWear,
    drivetrain_meters,
  };
  // console.log(`Suspension used time: ${suspension_usedTime} minutes`);
  // console.log(`Brake index wear: ${brake_indexWear}`);
  // console.log(`Drivetrain meters: ${drivetrain_meters} meters`);
}

const a = analyzeStravaData(stravaData, 85);
console.log(a);
