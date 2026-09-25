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

  @ApiProperty({ type: [Number], example: [12, 43, 51], description: 'Whole km so far, one per entry of weeks' })
  cumulative_km!: number[];

  @ApiProperty({ example: 51 })
  total_km!: number;
}

export class Response_DistanceDto {
  @ApiProperty({ example: 2026, description: 'The year served - last year when the current one has no ride yet' })
  year!: number;

  @ApiProperty({
    type: [String],
    example: ['2025-12-29', '2026-01-05'],
    description:
      'Monday of each week in UTC, from the week of 1 January to the current week (last week for a past year)',
  })
  weeks!: string[];

  @ApiProperty({ type: [Response_DistanceBikeDto], description: 'Bikes with km in the year, highest total first' })
  bikes!: Response_DistanceBikeDto[];
}
