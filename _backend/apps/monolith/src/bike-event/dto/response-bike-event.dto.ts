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

// Tags are seeded alongside their action, so they carry a key of their own. A user may add
// tags to an action for themselves; those carry no key and answer with custom: true.
export class ActionTagDto {
  @ApiProperty({ example: 12 })
  id!: number;

  @ApiProperty({ example: 'Full Flush' })
  tag!: string;

  @ApiProperty({ example: 'actionTag.fullFlush', nullable: true })
  i18n_key!: string | null;

  @ApiProperty({ example: false, description: 'true when the caller created this tag and may delete it' })
  custom!: boolean;
}

// 2. Mounted components related to actions
export class MountedComponentDto {
  // Mounted component ID
  @ApiProperty({ example: 45 })
  id!: number;

  // What a Replacement needs to create the part that goes on in this one's place.
  @ApiProperty({ example: 16 })
  component_type_id!: number;

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
  // The recorded row, which is what an edit addresses - not the catalogue action.
  @ApiProperty({ example: 500 })
  action_done_id!: number;

  // Information about action
  // Action ID
  @ApiProperty({ example: 1 })
  action_id!: number;

  @ApiProperty({ example: 'Brake bleed' })
  action_name!: string;

  @ApiProperty({ example: 'action.bleed', nullable: true, description: 'null for user-created actions' })
  action_i18n_key!: string | null;

  // Null when no price was recorded; the detail view reads that as work that carried no
  // charge, rather than leaving the line blank.
  @ApiProperty({ example: 150, nullable: true })
  partial_cost!: number | null;

  // What the action covers, from the catalogue. Never recorded per occasion - see ADR 0004.
  @ApiProperty({ type: [ActionTagDto] })
  tags!: ActionTagDto[];

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

  @ApiProperty({ example: 'Trail bike', nullable: true })
  bike_name!: string | null;

  // The bike's odometer on the service date, frozen on every action when it was written.
  // Null on a service that carries no actions, which has nothing to have frozen it.
  @ApiProperty({ example: 2450, nullable: true })
  bike_km_at_time!: number | null;

  @ApiProperty({ example: 4080, nullable: true })
  bike_minutes_at_time!: number | null;

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

// ---------------------------------------------------------------------
// ------------ Component Categories a bike has parts in ---------------
// ---------------------------------------------------------------------

// One tile on the wizard's category step. A category the bike has no parts in never
// reaches the client, so component_count is always at least one.
export class Response_BikeCategory_Dto {
  @ApiProperty({ example: 2 })
  group_id!: number;

  @ApiProperty({ example: 'Drivetrain' })
  group_name!: string;

  @ApiProperty({ example: 'componentGroup.drivetrain', nullable: true })
  group_i18n_key!: string | null;

  @ApiProperty({ example: false, description: 'Whether parts in this category are chosen per side' })
  side_choice!: boolean;

  @ApiProperty({ example: 3, description: 'Active Mounted Components the bike carries in this category' })
  component_count!: number;
}

// ---------------------------------------------------------------------
// ------------ One uploaded service attachment ------------------------
// ---------------------------------------------------------------------

// What the wizard holds on to until the Service is saved. The same three fields the
// create DTO takes back, so an upload can be handed straight to it.
export class Response_ServiceAttachment_Dto {
  @ApiProperty({ example: 'receipt.jpg', description: 'The name the file arrived under' })
  name!: string;

  @ApiProperty({ example: 'https://cdn.example.com/service-attachments/abc.webp' })
  url!: string;

  @ApiProperty({ example: 'image/webp', description: 'The type as stored, not as uploaded' })
  content_type!: string;
}

// ------------------------------------------------------------------
// ------------ Service history, one entry per occasion --------------
// ------------------------------------------------------------------

// One Action named on a history card. The key is what lets the card read in the user's
// language; the name is what a user-created action has instead.
export class ServiceHistoryActionDto {
  @ApiProperty({ example: 'Chain Replacement' })
  name!: string;

  @ApiProperty({ example: 'actions.chainReplacement', nullable: true })
  i18n_key!: string | null;
}

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

  @ApiProperty({ type: [ServiceHistoryActionDto] })
  actions!: ServiceHistoryActionDto[];

  @ApiProperty({ example: 350.5, nullable: true })
  total_cost!: number | null;
}

export class Response_ServiceHistory_Dto {
  @ApiProperty({ type: [ServiceHistoryItemDto] })
  items!: ServiceHistoryItemDto[];

  @ApiProperty({ example: 12, description: 'Services matching the filter, ignoring limit and offset' })
  total!: number;
}
