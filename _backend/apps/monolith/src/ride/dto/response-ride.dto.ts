import { ApiProperty } from '@nestjs/swagger';

// A ride the user has confirmed onto a bike — either matched by gear id or
// assigned by hand from the pending list. What the Rides list draws.
export class ResponseRideDto {
  @ApiProperty({ example: 42 })
  id!: number;

  // Strava's own activity id. Serialised as a string: it is a BigInt, and JSON
  // numbers lose precision past 2^53. Null for a ride not sourced from Strava.
  @ApiProperty({ example: '13579246810', nullable: true })
  activity_strava_id!: string | null;

  @ApiProperty({ example: 7 })
  bike_id!: number;

  // Carried on the ride rather than looked up on the client: a ride outlives
  // the bike it was ridden on, and a deleted bike is missing from the bike
  // list the client holds.
  @ApiProperty({ example: 'S-Works Tarmac', nullable: true })
  bike_name!: string | null;

  @ApiProperty({ example: '2026-08-19T06:12:00.000Z', nullable: true })
  started_at!: string | null;

  @ApiProperty({ example: 42000, nullable: true })
  distance_m!: number | null;

  @ApiProperty({ example: 96, nullable: true })
  duration_min!: number | null;

  @ApiProperty({ example: 612, nullable: true })
  elevation_up_m!: number | null;

  @ApiProperty({ example: 598, nullable: true })
  elevation_down_m!: number | null;

  @ApiProperty({ example: 26, nullable: true })
  speed_avg!: number | null;

  @ApiProperty({ example: 54, nullable: true })
  max_speed_kmh!: number | null;

  // The raw Strava activity as it was stored. The client reads the route
  // polyline out of it; everything else in there is unused for now.
  @ApiProperty({ nullable: true })
  json_data!: unknown;
}

// One page of rides. The total is what tells the client whether another page
// exists — a short page alone cannot, once rides are filtered out.
export class ResponseRidePageDto {
  @ApiProperty({ type: [ResponseRideDto] })
  items!: ResponseRideDto[];

  @ApiProperty({ example: 137 })
  total!: number;
}
