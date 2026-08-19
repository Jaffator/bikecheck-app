import { ApiProperty } from '@nestjs/swagger';

// A Strava ride waiting for the user to say which bike it belongs to. Carries
// enough of the ride for the user to recognise it — a list of dates alone does
// not tell you which ride you are assigning.
export class ResponsePendingStravaDto {
  // Strava's own activity id, which is what the resolve endpoint and the
  // notification route address. Serialised as a string: it is a BigInt, and
  // JSON numbers lose precision past 2^53.
  @ApiProperty({ example: '13579246810' })
  activity_id!: string;

  // Null when Strava sent no gear at all; set when the gear is unknown here.
  @ApiProperty({ example: 'b12345', nullable: true })
  gear_id!: string | null;

  @ApiProperty({ example: '2026-08-19T06:12:00.000Z' })
  started_at!: string;

  @ApiProperty({ example: 42 })
  distance_km!: number;

  @ApiProperty({ example: 96 })
  duration_min!: number;

  @ApiProperty({ example: 612 })
  elevation_up_m!: number;

  @ApiProperty({ example: '2026-08-19T06:40:00.000Z' })
  created_at!: Date;
}
