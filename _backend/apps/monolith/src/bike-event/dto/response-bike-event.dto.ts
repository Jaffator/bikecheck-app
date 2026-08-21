import { ApiProperty } from '@nestjs/swagger';

// 1. Attachments and components (used in Response_BikeEvent_Dto) ----
export class AttachmentDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'invoice.pdf' })
  name?: string;

  @ApiProperty({ example: 'application/pdf' })
  content_type?: string;

  @ApiProperty({ example: 'https://cdn.example.com/invoice.pdf' })
  url?: string;
}

// 2. Mounted components related to actions
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

  @ApiProperty({ example: 'component.brakeCaliper', nullable: true, description: 'null for user-created types' })
  component_type_i18n_key!: string | null;

  @ApiProperty({ example: 1240, nullable: true, description: 'total_km frozen at service time' })
  km_at_time!: number | null;

  @ApiProperty({ example: 3780, nullable: true, description: 'total_time_min frozen at service time' })
  time_min_at_time!: number | null;

  @ApiProperty({ example: 900, nullable: true, description: 'drivetrain_km frozen at service time' })
  drivetrain_km_at_time!: number | null;

  @ApiProperty({ example: 2100, nullable: true, description: 'suspension_min frozen at service time' })
  suspension_min_at_time!: number | null;
}

// 3. Action in Bike Event
export class ActionsDoneDto {
  // Information about action
  // Action ID
  @ApiProperty({ example: 1 })
  action_id!: number;

  @ApiProperty({ example: 'Brake bleed' })
  action_name!: string;

  @ApiProperty({ example: 'action.bleed', nullable: true, description: 'null for user-created actions' })
  action_i18n_key!: string | null;

  @ApiProperty({ example: 150, nullable: true })
  partial_cost?: number | null;

  @ApiProperty({ example: false })
  replace_action!: boolean;

  @ApiProperty({ example: 'Replaced brake pads', nullable: true })
  note!: string | null;

  // Components involved in this action
  @ApiProperty({ type: [MountedComponentDto] })
  mounted_components!: MountedComponentDto[];
}

// -----------------------------------------------------------------
// ------------ Created Bike Event with related actions ------------
// -----------------------------------------------------------------
export class Response_BikeEvent_Dto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 15 })
  bike_id!: number;

  @ApiProperty({ example: 'Regular service', nullable: true })
  note?: string | null;

  @ApiProperty({ example: 350.5 })
  total_cost!: number;

  // When the work happened. created_at answers the different question of when it was written down.
  @ApiProperty({ nullable: true })
  service_date!: Date | null;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty({ nullable: true })
  updated_at?: Date | null;

  @ApiProperty({ type: [ActionsDoneDto] })
  actions_done!: ActionsDoneDto[];

  @ApiProperty({ type: [AttachmentDto] })
  attachments?: AttachmentDto[];
}

// Tags are seeded alongside their action, so they carry a key of their own.
export class ActionTagDto {
  @ApiProperty({ example: 'Full Flush' })
  tag!: string;

  @ApiProperty({ example: 'actionTag.fullFlush', nullable: true })
  i18n_key!: string | null;
}

// 1. Actions (used in Response_ActionsOnGroup_Dto) ----
export class ActionDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Brake bleed' })
  action_name!: string;

  @ApiProperty({ example: 'action.bleed', nullable: true, description: 'null for user-created actions' })
  action_i18n_key!: string | null;

  @ApiProperty({ example: false })
  replace_action!: boolean;

  @ApiProperty({ type: [ActionTagDto] })
  tags!: ActionTagDto[];

  @ApiProperty({ type: [MountedComponentDto] })
  components!: MountedComponentDto[];
}

// ---------------------------------------------------------------------
// ------------ Actions related to selected components group ------------
// ---------------------------------------------------------------------
export class Response_ActionsOnGroup_Dto {
  @ApiProperty({ example: 1 })
  group_id!: number;

  @ApiProperty({ example: 'Brake System' })
  group_name!: string;

  @ApiProperty({ example: 'componentGroup.brakes', nullable: true })
  group_i18n_key!: string | null;

  @ApiProperty({ example: false })
  side_choice!: boolean;

  @ApiProperty({ type: [ActionDto] })
  actions!: ActionDto[];
}

// ------------------------------------------------------------------
// ------------ Service history, one entry per occasion --------------
// ------------------------------------------------------------------

// Only what a history card renders - the full picture comes from the detail endpoint.
export class ServiceHistoryItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 15 })
  bike_id!: number;

  @ApiProperty({ example: 'Trail bike', nullable: true })
  bike_name!: string | null;

  @ApiProperty({ nullable: true, description: 'When the work happened, not when it was recorded' })
  service_date!: Date | null;

  @ApiProperty({ example: 2 })
  action_count!: number;

  @ApiProperty({ example: ['Chain Replacement', 'Brake bleed'], type: [String] })
  action_names!: string[];

  @ApiProperty({ example: 350.5, nullable: true })
  total_cost!: number | null;
}

export class Response_ServiceHistory_Dto {
  @ApiProperty({ type: [ServiceHistoryItemDto] })
  items!: ServiceHistoryItemDto[];

  @ApiProperty({ example: 12, description: 'Services matching the filter, ignoring limit and offset' })
  total!: number;
}
