import type { bike_types, wheel_sizes, bike_sizes, ride_styles } from '@prisma/client';

export type NewBikeFormData = {
  bikeTypes: bike_types[];
  wheelSizes: wheel_sizes[];
  bikeSizes: bike_sizes[];
  rideStyles: ride_styles[];
};
