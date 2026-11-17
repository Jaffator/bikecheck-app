import { ApiProperty } from '@nestjs/swagger';

export class Response_DistanceBikeDto {
  @ApiProperty({ example: 21 })
  bike_id!: number;

  @ApiProperty({ example: 'Santa Cruz' })
  bike_brand!: string;

  @ApiProperty({ type: String, example: 'Hightower', nullable: true })
  bike_model!: string | null;

  @ApiProperty({ type: Number, example: 2022, nullable: true })
  year!: number | null;

  @ApiProperty({
    example: 0,
    description: "Rank by id among all the owner's bikes, archived included, so a colour never shifts",
  })
  color_index!: number;

  @ApiProperty({
    type: [Number],
    example: [0, 12400, 0, 38200],
    description: 'Metres per UTC day, index 0 = from, one entry per day through to',
  })
  daily_m!: number[];

  @ApiProperty({
    type: [Number],
    example: [0, 310, 0, 845],
    description: 'Metres climbed per UTC day, indexed like daily_m; a ride without elevation_up_m climbs 0',
  })
  daily_elevation_m!: number[];

  @ApiProperty({
    type: [Number],
    example: [0, 45, 0, 125],
    description: 'Minutes ridden per UTC day, indexed like daily_m; a ride without duration_min rides 0',
  })
  daily_time_min!: number[];

  @ApiProperty({ example: 51, description: 'Whole km of the sum of daily_m' })
  total_km!: number;

  @ApiProperty({ example: 4, description: 'Rides started in the window' })
  ride_count!: number;

  @ApiProperty({ example: 312, description: "The sum of those rides' duration_min" })
  time_min!: number;
}

// The totals stop at the same day of the previous Period, a custom one's at its end; the days run through the whole.
export class Response_DistancePreviousDto {
  @ApiProperty({ example: '2026-10-01', description: 'First UTC day of the previous Period, index 0 of the days' })
  from!: string;

  @ApiProperty({ example: 48200, description: 'Metres ridden up to the same day' })
  meters!: number;

  @ApiProperty({ example: 1240, description: 'Metres climbed up to the same day' })
  elevation_m!: number;

  @ApiProperty({ example: 260, description: 'Minutes ridden up to the same day' })
  time_min!: number;

  @ApiProperty({
    type: [Number],
    example: [20000, 0, 15000, 70000],
    description: "The garage's metres per UTC day over the whole previous Period",
  })
  daily_m!: number[];

  @ApiProperty({
    type: [Number],
    example: [400, 50, 0, 1500],
    description: 'Metres climbed per day, indexed like daily_m',
  })
  daily_elevation_m!: number[];

  @ApiProperty({
    type: [Number],
    example: [60, 20, 45, 200],
    description: 'Minutes ridden per day, indexed like daily_m',
  })
  daily_time_min!: number[];
}

export class Response_DistanceDto {
  @ApiProperty({ example: '2026-01-01', description: 'First UTC day daily_m covers, inclusive' })
  from!: string;

  @ApiProperty({ example: '2026-09-28', description: 'Last UTC day daily_m covers, inclusive' })
  to!: string;

  @ApiProperty({
    type: [Response_DistanceBikeDto],
    description: 'Bikes with at least one ride in the window, highest total first',
  })
  bikes!: Response_DistanceBikeDto[];

  @ApiProperty({
    type: Response_DistancePreviousDto,
    nullable: true,
    description:
      "The garage's previous Period of the same kind, under the same ride rules; null for all time and for no period",
  })
  previous!: Response_DistancePreviousDto | null;
}
