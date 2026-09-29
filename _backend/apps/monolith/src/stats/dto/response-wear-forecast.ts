import { ApiProperty } from '@nestjs/swagger';
import { Response_GarageTrackedActionDto } from '../../service-tracking/dto/response-garage-tracked-action';

export class Response_WearPointDto {
  @ApiProperty({ example: '2026-09-20', description: 'ISO date in UTC' })
  date!: string;

  @ApiProperty({ example: 64, description: 'Whole percent of the way to being due on that day, never below 0' })
  percentage!: number;
}

export class Response_WearForecastItemDto extends Response_GarageTrackedActionDto {
  @ApiProperty({
    type: Number,
    example: 42.5,
    nullable: true,
    description: "Wear per week at the last 4 weeks' pace, in the reading's unit; null when the bike was not ridden",
  })
  pace_per_week!: number | null;

  @ApiProperty({
    type: String,
    example: '2026-11-12',
    nullable: true,
    description: 'When the reading reaches 100 % at that pace; null when overdue or without pace',
  })
  projected_date!: string | null;

  @ApiProperty({
    type: [Response_WearPointDto],
    description: 'From the Wear Baseline moment, each week end, then today at the current percentage',
  })
  points!: Response_WearPointDto[];
}

export class Response_WearForecastDto {
  @ApiProperty({
    type: [Response_WearForecastItemDto],
    description: 'Up to 5, soonest to run out first, overdue first',
  })
  items!: Response_WearForecastItemDto[];
}
