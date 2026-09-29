import { IsInt, IsPositive } from 'class-validator';

export class SyncAthleteDto {
  @IsInt()
  @IsPositive()
  athleteId!: number;

  // Unix seconds; Strava's `after` filters on the ride's start, not its upload.
  @IsInt()
  @IsPositive()
  after!: number;
}
