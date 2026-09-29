import { ApiProperty } from '@nestjs/swagger';
import { check_in_status, check_in_symptom } from '@prisma/client';
import { Response_WoreOffLineDto } from '../../service-tracking/dto/response-wore-off-line';

// How the bike rode on the ride, as its rider said.
export class ResponseRideCheckInDto {
  @ApiProperty({ enum: check_in_status })
  status!: check_in_status;

  // Empty when OK.
  @ApiProperty({ enum: check_in_symptom, isArray: true })
  symptoms!: check_in_symptom[];

  @ApiProperty({ example: 'Skips on the 3rd cog', nullable: true })
  note!: string | null;
}

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

  // Strava's own title for the activity, lifted out of the stored payload so
  // the list does not have to parse the raw blob to draw a heading. Strava
  // always sends one — it auto-names an untitled ride — so this is never null;
  // the empty string is only the type-level floor.
  @ApiProperty({ example: 'Morning Mountain Bike Ride' })
  name!: string;

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

  // The route, lifted out of the stored payload for the same reason the name is:
  // the raw Strava activity is tens of kilobytes and this is the only part of it
  // the client draws. Strava's own simplified route - null for a ride recorded
  // without GPS.
  @ApiProperty({ example: 'ki}fHuqrbBGx@_@lAsA|Bi@n@', nullable: true })
  summary_polyline!: string | null;

  // The Tracked Actions the ride pushed closest to due, at most three; empty where it wore off nothing.
  @ApiProperty({ type: [Response_WoreOffLineDto] })
  wore_off!: Response_WoreOffLineDto[];

  // Null until the rider says how the bike rode.
  @ApiProperty({ type: ResponseRideCheckInDto, nullable: true })
  check_in!: ResponseRideCheckInDto | null;
}

// A week holding rides on the page, totalled over all its rides inside the filter.
export class ResponseRideWeekDto {
  // The week's Monday in the rider's time zone.
  @ApiProperty({ example: '2026-09-21' })
  start!: string;

  @ApiProperty({ example: 3 })
  count!: number;

  @ApiProperty({ example: 96.4 })
  km!: number;

  @ApiProperty({ example: 347 })
  time_min!: number;
}

// Every ride inside the filter added up, not just the page.
export class ResponseRideFiguresDto {
  @ApiProperty({ example: 9 })
  count!: number;

  @ApiProperty({ example: 440000 })
  distance_m!: number;

  @ApiProperty({ example: 1450 })
  time_min!: number;

  @ApiProperty({ example: 8640 })
  elevation_up_m!: number;

  @ApiProperty({ example: 9120 })
  elevation_down_m!: number;

  // The same span just before the filter; null when the filter has no from and to.
  @ApiProperty({ example: 392000, nullable: true })
  previous_distance_m!: number | null;
}

// One page of rides. The total is what tells the client whether another page
// exists — a short page alone cannot, once rides are filtered out.
export class ResponseRidePageDto {
  @ApiProperty({ type: [ResponseRideDto] })
  items!: ResponseRideDto[];

  @ApiProperty({ example: 137 })
  total!: number;

  // Newest first, one per week the page's rides fall in.
  @ApiProperty({ type: [ResponseRideWeekDto] })
  weeks!: ResponseRideWeekDto[];

  @ApiProperty({ type: ResponseRideFiguresDto })
  figures!: ResponseRideFiguresDto;
}
