import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt } from 'class-validator';

// Whether one Tracked Action may announce itself. False stops the push and nothing else -
// the reading still reads and the dashboard still lists it (ADR 0033).
export class SetTrackedActionNotifyDto {
  @ApiProperty({ example: 55 })
  @IsInt()
  component_mounted_id!: number;

  @ApiProperty({ example: 42 })
  @IsInt()
  event_action_id!: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  notify!: boolean;
}
