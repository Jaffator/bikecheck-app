import { lastRideDate } from "@/features/bikes/lastRideDate";
import type { Ride } from "./rides.types";

// A ride keeps no Strava title (policy §6.2), so it is named by its bike, day and distance.
export function rideTitle(ride: Ride, unknownBike: string): string {
  const date = ride.started_at === null ? null : lastRideDate(ride.started_at);
  const km = `${Math.round((ride.distance_m ?? 0) / 1000)} km`;
  return [ride.bike_name ?? unknownBike, date, km].filter((part) => part !== null).join(" · ");
}
