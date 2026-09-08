import { ApiProperty } from '@nestjs/swagger';
import type { AttentionLevel } from '../attention-level';

// Which reading a Tracked Action is measured on — whichever the bike's Service Interval
// fills in.
export type TrackedAxis = 'km' | 'min' | 'health_index';

// One mounted component paired with one action the bike keeps a Service Interval for. Every
// figure on it is derived on read (ADR 0026); nothing here is stored.
export class Response_TrackedActionDto {
  @ApiProperty({ example: 21 })
  bike_id!: number;

  @ApiProperty({ example: 55 })
  component_mounted_id!: number;

  @ApiProperty({ example: 12 })
  component_type_id!: number;

  @ApiProperty({ example: 'Chain' })
  component_type!: string;

  @ApiProperty({ example: 'component.chain', nullable: true, description: 'null for user-created types' })
  component_type_i18n_key!: string | null;

  @ApiProperty({ example: 'Shimano XT M8100', nullable: true })
  component_desc!: string | null;

  @ApiProperty({ example: 'front', nullable: true, description: 'The side of the bike the part sits on' })
  position!: string | null;

  @ApiProperty({ example: 4 })
  action_id!: number;

  @ApiProperty({ example: 'Chain Replacement' })
  action_name!: string;

  @ApiProperty({ example: 'action.chainReplacement', nullable: true, description: 'null for user-created actions' })
  action_i18n_key!: string | null;

  @ApiProperty({ enum: ['km', 'min', 'health_index'], example: 'km' })
  axis!: TrackedAxis;

  @ApiProperty({ example: 3200, description: 'Wear on the axis since the last Service of this pair' })
  current_value!: number;

  @ApiProperty({ example: 4000, description: 'The Service Interval on that axis, with any Extension added' })
  interval_value!: number;

  @ApiProperty({ example: 132.5, description: 'Never capped — an overdue part reads past 100' })
  percentage!: number;

  @ApiProperty({ enum: ['good', 'warning', 'critical', 'overdue'], example: 'overdue' })
  attention_level!: AttentionLevel;
}
