import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

// Which Tracked Action to put off: a part and an action, which is what identifies one
// (ADR 0027). How long it stays off is not the caller's to say - it is off until the
// reading moves out of the band it was put off in.
export class PostponeTrackedActionDto {
  @ApiProperty({ example: 55 })
  @IsInt()
  component_mounted_id!: number;

  @ApiProperty({ example: 42 })
  @IsInt()
  event_action_id!: number;
}
