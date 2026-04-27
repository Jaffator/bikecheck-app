import { ApiProperty } from '@nestjs/swagger';

// ---- RESPONSE created Bike Event ----
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

  actions!: ActionDto[];

  attachments?: AttachmentDto[];
}

// ---- RESPONSE actions releated to selected components group ----
export class Response_ActionsOnGroup_Dto {
  @ApiProperty({ example: 1 })
  group_id!: number;

  @ApiProperty({ example: 'Brake System' })
  group_name!: string;

  @ApiProperty({ example: false })
  side_choice!: boolean;

  actions!: ActionDto[];
}

// ---- Additional DTOs for actions and attachments (used in Response_ActionsOnGroup_Dto) ----
export class ActionDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Brake bleed' })
  action_name!: string;

  @ApiProperty({ example: false })
  replace_action!: boolean;

  @ApiProperty({ example: ['maintenance', 'hydraulic'], type: [String] })
  tags!: string[];

  components!: ComponentDto[];
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

// ---- Additional DTO for components (used in ActionDto) ----
export class ComponentDto {
  @ApiProperty({ example: 45 })
  id!: number;

  @ApiProperty({ example: 'Shimano XT M8100', nullable: true })
  component_desc!: string | null;

  @ApiProperty({ example: 'front', nullable: true })
  position!: string | null;

  @ApiProperty({ example: 'Brake' })
  component_type!: string;
}
