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

  @ApiProperty({ example: 51, description: 'Whole km of the sum of daily_m' })
  total_km!: number;

  @ApiProperty({ example: 4, description: 'Rides started in the window' })
  ride_count!: number;

  @ApiProperty({ example: 312, description: "The sum of those rides' duration_min" })
  time_min!: number;
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
}
