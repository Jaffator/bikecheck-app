import { ApiProperty, PickType } from '@nestjs/swagger';
import { Response_TrackedActionDto } from './response-tracked-action';

// What one ride wore off one Tracked Action: the wear it added and the reading either side
// of it. Derived when the ride is read and stored nowhere (ADR 0026).
export class Response_WoreOffLineDto extends PickType(Response_TrackedActionDto, [
  'component_mounted_id',
  'event_action_id',
  'component_type',
  'component_type_i18n_key',
  'position',
  'action_name',
  'action_i18n_key',
  'replace_action',
  'measure',
] as const) {
  @ApiProperty({ example: 32, description: "The ride's own wear on the reading's measure: km, minutes or index" })
  amount!: number;

  @ApiProperty({ example: 94, description: 'Whole percent of the way to due before the ride' })
  before!: number;

  @ApiProperty({ example: 95, description: 'Whole percent of the way to due once the ride ended' })
  after!: number;
}
