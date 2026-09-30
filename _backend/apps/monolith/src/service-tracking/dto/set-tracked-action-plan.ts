import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsTimeZone, Matches, ValidateIf } from 'class-validator';

// The day the owner means to do one Tracked Action - a part and an action (ADR 0027). A day and nothing else (ADR 0038).
export class SetTrackedActionPlanDto {
  @ApiProperty({ example: 55 })
  @IsInt()
  component_mounted_id!: number;

  @ApiProperty({ example: 42 })
  @IsInt()
  event_action_id!: number;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-10-04',
    nullable: true,
    description: 'YYYY-MM-DD, today or later; null removes the plan',
  })
  // Null removes the plan, so only a value that is there has to be a day.
  @ValidateIf((_, value) => value !== null)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  planned_for!: string | null;

  @ApiPropertyOptional({
    example: 'Europe/Prague',
    description: 'IANA zone the 08:00 reminder is timed in; not stored. Europe/Prague when absent',
  })
  @IsOptional()
  @IsTimeZone()
  time_zone?: string;
}
