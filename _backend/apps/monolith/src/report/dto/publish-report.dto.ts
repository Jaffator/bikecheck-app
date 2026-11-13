import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

// What the owner agrees to when the Share Link opens.
export class PublishReportDto {
  @ApiProperty({ example: true, description: 'Strava-derived km and time may be read through the link' })
  @IsBoolean()
  share_figures!: boolean;
}
