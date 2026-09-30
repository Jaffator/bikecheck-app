import { IsArray, IsInt, IsPositive } from 'class-validator';

export class SyncEnqueueDto {
  @IsInt()
  @IsPositive()
  athleteId!: number;

  // Only rides the monolith has neither saved nor dismissed.
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  activityIds!: number[];
}
