// What the desktop rides table adds up: the filter's figures and each week's totals.
import { Prisma } from '@prisma/client';
import { ResponseRideFiguresDto, ResponseRideWeekDto } from './dto/response-ride.dto';
import { weekStart } from './ride-period';

export const summedRideSelect = {
  started_at: true,
  distance_m: true,
  duration_min: true,
  elevation_up_m: true,
  elevation_down_m: true,
} satisfies Prisma.ridesSelect;
export type SummedRide = Prisma.ridesGetPayload<{ select: typeof summedRideSelect }>;

// Null previous rides mean there is no previous period to compare with.
export function figuresOf(rides: SummedRide[], previous: SummedRide[] | null): ResponseRideFiguresDto {
  return {
    count: rides.length,
    distance_m: sum(rides, 'distance_m'),
    time_min: sum(rides, 'duration_min'),
    elevation_up_m: sum(rides, 'elevation_up_m'),
    elevation_down_m: sum(rides, 'elevation_down_m'),
    previous_distance_m: previous === null ? null : sum(previous, 'distance_m'),
  };
}

// The weeks the page's rides fall in, newest first, each totalled over every ride of it in the filter.
export function weeksOf(page: { started_at?: Date | null }[], rides: SummedRide[], tz: string): ResponseRideWeekDto[] {
  const shown = new Set(page.flatMap((ride) => (ride.started_at ? [weekStart(ride.started_at, tz)] : [])));
  const byWeek = new Map<string, SummedRide[]>();
  for (const ride of rides) {
    if (ride.started_at === null) continue;
    const start = weekStart(ride.started_at, tz);
    if (shown.has(start)) byWeek.set(start, [...(byWeek.get(start) ?? []), ride]);
  }
  return [...byWeek.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([start, week]) => ({
      start,
      count: week.length,
      // One decimal, as the table prints a ride's kilometres.
      km: Math.round(sum(week, 'distance_m') / 100) / 10,
      time_min: sum(week, 'duration_min'),
    }));
}

type SummedColumn =Exclude<keyof SummedRide, 'started_at'>;

function sum(rides: SummedRide[], column: SummedColumn): number {
  return rides.reduce((total, ride) => total + (ride[column] ?? 0), 0);
}
