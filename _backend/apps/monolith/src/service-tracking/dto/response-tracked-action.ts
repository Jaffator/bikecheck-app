import { ApiProperty } from '@nestjs/swagger';
import type { AttentionLevel, WearAxis } from '../attention-level';

// One Tracked Action as it reads right now: a mounted part, one action the bike keeps a
// Service Interval for, and how far the part has come towards that action being due.
// Nothing here is stored - every figure is derived from the accumulator, the Wear Baseline
// and the interval at the moment of the read (ADR 0026).
export class Response_TrackedActionDto {
  @ApiProperty({ example: 21, description: 'The bike carrying the part, which a row opens' })
  bike_id!: number;

  @ApiProperty({ example: 55 })
  component_mounted_id!: number;

  @ApiProperty({ example: 12 })
  component_type_id!: number;

  @ApiProperty({ example: 'Chain' })
  component_type!: string;

  @ApiProperty({ type: String, example: 'component.chain', nullable: true })
  component_type_i18n_key!: string | null;

  @ApiProperty({ type: String, example: 'Shimano XT M8100', nullable: true })
  component_desc!: string | null;

  @ApiProperty({ type: String, example: 'front', nullable: true })
  position!: string | null;

  @ApiProperty({ example: 42 })
  event_action_id!: number;

  @ApiProperty({ example: 'Chain Replacement' })
  action_name!: string;

  @ApiProperty({ type: String, example: 'action.chainReplacement', nullable: true })
  action_i18n_key!: string | null;

  @ApiProperty({ enum: ['km', 'min', 'health_index'], example: 'km' })
  axis!: WearAxis;

  @ApiProperty({ example: 3200, description: 'Wear on that axis since the Wear Baseline' })
  current!: number;

  @ApiProperty({
    example: 4000,
    description: 'The Service Interval on that axis, including any Extension in force',
  })
  interval!: number;

  @ApiProperty({ example: 80, description: 'Whole percent of the way to being due. Never capped' })
  percentage!: number;

  @ApiProperty({ enum: ['good', 'warning', 'critical', 'overdue'], example: 'warning' })
  level!: AttentionLevel;

  @ApiProperty({ example: false, description: 'The action has been put off, lengthening its interval' })
  extended!: boolean;
}
