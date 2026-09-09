import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

// Which Tracked Action to put off: a part and an action, which is what identifies one
// (ADR 0027). What the Extension is worth is the server's own rule, so there is no number
// to send.
export class PostponeTrackedActionDto {
  @ApiProperty({ example: 55 })
  @IsInt()
  component_mounted_id!: number;

  @ApiProperty({ example: 42 })
  @IsInt()
  event_action_id!: number;
}
