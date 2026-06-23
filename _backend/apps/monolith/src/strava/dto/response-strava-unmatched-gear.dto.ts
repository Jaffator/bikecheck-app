import { ApiProperty } from '@nestjs/swagger';
import { StravaBike } from '@contracts/strava-gear.contract';

export class ResponseUnmatchedStravaGearDto {
  @ApiProperty({ example: 1 })
  user_id!: number;

  @ApiProperty({ example: 12345 })
  athlete_id!: number;

  @ApiProperty({ isArray: true })
  strava_bikes!: StravaBike[];

  @ApiProperty({ isArray: true })
  bikecheck_bikes!: {
    id: number;
    strava_gear_id: string | null;
    bikename: string | null;
    bike_brand: string;
    bike_model: string | null;
  }[];
}
