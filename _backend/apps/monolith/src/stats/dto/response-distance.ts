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
    description:
      'Metres per UTC day, index 0 = 1 January; runs to today for the current year, 365/366 days for a past one',
  })
  daily_m!: number[];

  @ApiProperty({ example: 51, description: 'Whole km of the sum of daily_m' })
  total_km!: number;
}

export class Response_DistanceDto {
  @ApiProperty({ example: 2026, description: 'The year served - last year when the current one has no ride yet' })
  year!: number;

  @ApiProperty({ type: [Response_DistanceBikeDto], description: 'Bikes with km in the year, highest total first' })
  bikes!: Response_DistanceBikeDto[];
}
