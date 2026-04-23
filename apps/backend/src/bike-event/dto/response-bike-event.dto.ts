import { ApiProperty } from '@nestjs/swagger';

export class ResponseBikeEventDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 15, nullable: true })
  bike_id!: number | null;

  @ApiProperty({ example: 'Replaced chain and cassette', nullable: true })
  note!: string | null;

  @ApiProperty({ example: 150.5, nullable: true })
  total_cost!: any;

  @ApiProperty({ example: '2024-01-01T12:00:00Z', nullable: true })
  created_at!: Date | null;

  @ApiProperty({ example: '2024-01-02T12:00:00Z', nullable: true })
  updated_at!: Date | null;

  @ApiProperty({ example: false, nullable: true })
  is_deleted!: boolean | null;

  @ApiProperty({ example: null, nullable: true })
  deleted_at!: Date | null;
}

export class ActionComponentsDto {
  @ApiProperty({ example: 42 })
  id!: number;

  @ApiProperty({ example: 'Brake' })
  component_type!: string;

  @ApiProperty({ example: 'Shimano XT M8100' })
  component_desc!: string | null;

  @ApiProperty({ example: 'front' })
  position!: string | null;
}

export class ActionDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Bleed brake' })
  action_name!: string;

  @ApiProperty({ example: false })
  replace_action!: boolean;

  @ApiProperty({ example: ['maintenance', 'hydraulic'] })
  tags!: string[];

  @ApiProperty({ type: [ActionComponentsDto] })
  components!: ActionComponentsDto[];
}

export class ResponseActionsAndComponenetsDto {
  group_id!: number;

  @ApiProperty({ example: 'Suspension' })
  group_name!: string;

  @ApiProperty({ example: false })
  side_choice!: boolean;

  @ApiProperty({ type: [ActionDto] })
  actions!: ActionDto[];
}
