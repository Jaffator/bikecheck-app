import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, ValidateIf } from 'class-validator';

// The owner's own Service Interval for one Tracked Action - a part and an action, which is
// what identifies one (ADR 0027). Only the number is theirs to set: which axis the reading
// is taken on follows the part's type, so the bike's plan keeps it (ADR 0033).
export class SetTrackedActionIntervalDto {
  @ApiProperty({ example: 55 })
  @IsInt()
  component_mounted_id!: number;

  @ApiProperty({ example: 42 })
  @IsInt()
  event_action_id!: number;

  @ApiProperty({
    type: Number,
    example: 2500,
    nullable: true,
    description: "Null clears the override, putting the bike's plan back",
  })
  // Null is Reset to default, so only a value that is there has to be a usable interval.
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @IsPositive()
  interval_override!: number | null;
}
