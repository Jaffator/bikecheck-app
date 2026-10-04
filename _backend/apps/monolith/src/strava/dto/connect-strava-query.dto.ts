import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import type { StravaReturnTo } from '@contracts/strava-oauth.contract';

const PLATFORMS: StravaReturnTo[] = ['web', 'native'];

export class ConnectStravaQueryDto {
  // Where Strava's callback sends the browser; an older app sends nothing and keeps the deep link.
  @ApiPropertyOptional({ enum: PLATFORMS, default: 'native' })
  @IsOptional()
  @IsIn(PLATFORMS)
  platform?: StravaReturnTo;
}
