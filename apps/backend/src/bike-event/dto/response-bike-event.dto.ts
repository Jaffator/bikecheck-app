import { ApiProperty } from '@nestjs/swagger';

// Mounted components realeted to actions
export class MountedComponentDto {
  // Mounted component ID
  @ApiProperty({ example: 45 })
  id!: number;

  @ApiProperty({ example: 'Shimano XT M8100', nullable: true })
  component_desc!: string | null;

  @ApiProperty({ example: 'front', nullable: true })
  position!: string | null;

  @ApiProperty({ example: 'Brake' })
  component_type!: string;
}

// Action in Bike Event
export class ActionsDoneDto {
  // Information about action
  // Action ID
  @ApiProperty({ example: 1 })
  action_id!: number;

  @ApiProperty({ example: 'Brake bleed' })
  action_name!: string;

  @ApiProperty({ example: 150 })
  partial_cost!: number;

  @ApiProperty({ example: false })
  replace_action!: boolean;

  @ApiProperty({ example: 'Replaced brake pads', nullable: true })
  note!: string | null;

  // Components involved in this action
  @ApiProperty({ type: [MountedComponentDto] })
  mounted_components!: MountedComponentDto[];
}

// ------------ CREATED Bike Event ------------
export class Response_BikeEvent_Dto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 15 })
  bike_id!: number;

  @ApiProperty({ example: 'Regular service', nullable: true })
  note?: string;

  @ApiProperty({ example: 350.5 })
  total_cost!: number;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty({ nullable: true })
  updated_at?: Date;

  @ApiProperty({ type: [ActionsDoneDto] })
  actions_done!: ActionsDoneDto[];
}

// ---- Actions (used in Response_ActionsOnGroup_Dto) ----
export class ActionDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Brake bleed' })
  action_name!: string;

  @ApiProperty({ example: false })
  replace_action!: boolean;

  @ApiProperty({ example: ['maintenance', 'hydraulic'], type: [String] })
  tags!: string[];

  @ApiProperty({ type: [MountedComponentDto] })
  components!: MountedComponentDto[];
}

// ---- Actions related to selected components group ----
export class Response_ActionsOnGroup_Dto {
  @ApiProperty({ example: 1 })
  group_id!: number;

  @ApiProperty({ example: 'Brake System' })
  group_name!: string;

  @ApiProperty({ example: false })
  side_choice!: boolean;

  @ApiProperty({ type: [ActionDto] })
  actions!: ActionDto[];
}

// ---- Additional DTOs for attachments and components (used in Response_ActionsOnGroup_Dto) ----
export class AttachmentDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'invoice.pdf' })
  name!: string;

  @ApiProperty({ example: 'application/pdf' })
  content_type!: string;

  @ApiProperty({ example: 'https://cdn.example.com/invoice.pdf' })
  url!: string;
}
