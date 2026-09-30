import type { RiddenBike } from "./bikes.types";

export interface BikeFigures {
  km: number;
  elevationM: number;
  timeMin: number;
}

// The typed-in odometer plus what the rides add; elevation only ever comes from rides.
export function bikeFigures(bike: RiddenBike): BikeFigures {
  return {
    km: (bike.total_km ?? 0) + bike.ride_km,
    elevationM: bike.ride_elevation_m,
    timeMin: (bike.total_time_min ?? 0) + bike.ride_time_min,
  };
}
