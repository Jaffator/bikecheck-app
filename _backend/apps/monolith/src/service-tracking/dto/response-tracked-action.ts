import { ApiProperty } from '@nestjs/swagger';
import type { AttentionLevel, WearAxis, WearMeasure } from '../attention-level';

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

  @ApiProperty({ example: 2, description: 'The Component Category the part sits in, which a service link names' })
  component_group_id!: number;

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

  @ApiProperty({
    enum: ['total_km', 'drivetrain_km', 'total_time_min', 'suspension_min', 'health_index'],
    example: 'drivetrain_km',
    description: 'Which accumulator the reading was taken from, which is not implied by the axis',
  })
  measure!: WearMeasure;

  @ApiProperty({ example: 3200, description: 'Wear on that axis since the Wear Baseline' })
  current!: number;

  @ApiProperty({
    example: 4000,
    description: "The Service Interval in force on that axis: the owner's own where they set one",
  })
  interval!: number;

  @ApiProperty({ example: 80, description: 'Whole percent of the way to being due. Never capped' })
  percentage!: number;

  @ApiProperty({ enum: ['very_good', 'good', 'warning', 'critical', 'overdue'], example: 'warning' })
  level!: AttentionLevel;

  @ApiProperty({
    example: 4000,
    description: "The bike's own plan on that axis, which clearing the override restores",
  })
  default_interval!: number;

  @ApiProperty({
    type: Number,
    example: 2500,
    nullable: true,
    description: "The owner's own Service Interval, or null where the reading follows the bike's plan",
  })
  interval_override!: number | null;

  @ApiProperty({ example: true, description: "False silences this pairing's announcements and nothing else" })
  notify!: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'When the part went on the bike, which the reading is judged against',
  })
  mounted_at!: Date | null;

  @ApiProperty({
    example: true,
    description: 'The action replaces the part rather than servicing it, which names the button that records it',
  })
  replace_action!: boolean;
}
