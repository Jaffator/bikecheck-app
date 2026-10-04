import { IsIn, IsInt, IsOptional, IsPositive } from 'class-validator';
import type { StravaReturnTo } from '@contracts/strava-oauth.contract';

export const STRAVA_RETURN_TO: StravaReturnTo[] = ['web', 'native'];

export class CreateOAuthStateDto {
  @IsInt()
  @IsPositive()
  userId!: number;

  // Absent from an older monolith: the deep link, as before.
  @IsOptional()
  @IsIn(STRAVA_RETURN_TO)
  returnTo?: StravaReturnTo;
}
