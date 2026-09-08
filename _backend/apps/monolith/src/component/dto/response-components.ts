import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested, IsString } from 'class-validator';
import { CreateMountedComponentsDto } from './create-components';

export class AssembleBikeComponentsDto {
  @ApiProperty({ type: () => CreateMountedComponentsDto })
  @ValidateNested()
  @Type(() => CreateMountedComponentsDto)
  component!: CreateMountedComponentsDto;

  @ApiProperty({ example: 'Fork' })
  @IsString()
  component_name!: string;

  @ApiProperty({ example: '15' })
  component_group_id!: number;

  @ApiProperty({ type: String, example: 'component.fork', nullable: true, description: 'null for user-created types' })
  component_i18n_key!: string | null;

  @ApiProperty({ example: true, description: 'The part sits on a side of the bike (front / rear)' })
  has_position!: boolean;

  @ApiProperty({ example: true, description: 'Every bike carries it, so it is saved even when left blank' })
  essential!: boolean;
}

export class Response_ComponentGroupDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Drivetrain' })
  group_name!: string;

  @ApiProperty({ example: 'componentGroup.drivetrain', nullable: true })
  i18n_key!: string | null;

  @ApiProperty({ example: false })
  side_choice!: boolean;
}

export class Response_ComponentDto {
  // What the caller picks the new type with straight after naming it.
  @ApiProperty({ example: 91 })
  id!: number;

  @ApiProperty({ example: 15 })
  component_group_id!: number;

  @ApiProperty({ example: 1 })
  user_id!: number | null;

  @ApiProperty({ example: 'Custom Component Name' })
  component_type!: string;

  @ApiProperty({ example: 'component.chain', nullable: true, description: 'null for user-created types' })
  i18n_key!: string | null;

  @ApiProperty({ example: false })
  ebike!: boolean;

  @ApiProperty({ example: true })
  has_position!: boolean;

  @ApiProperty({ example: true, description: 'Every bike carries it, so it is saved even when left blank' })
  essential!: boolean;
}

// One Mounted Component as the bike detail's components section reads it: the part, the
// kind of part it is, the category it sits in, what it has accumulated, and — decided
// here rather than left for the client — whether a Service has hardened it (ADR 0016).
export class Response_BikeComponentDto {
  @ApiProperty({ example: 55 })
  id!: number;

  @ApiProperty({ example: 21 })
  bike_id!: number;

  @ApiProperty({ example: 12 })
  component_type_id!: number;

  @ApiProperty({ example: 'Fork' })
  component_type!: string;

  @ApiProperty({ type: String, example: 'component.fork', nullable: true, description: 'null for user-created types' })
  component_type_i18n_key!: string | null;

  @ApiProperty({ example: 3 })
  component_group_id!: number;

  @ApiProperty({ example: 'Suspension' })
  component_group!: string;

  @ApiProperty({ type: String, example: 'componentGroup.suspension', nullable: true })
  component_group_i18n_key!: string | null;

  @ApiProperty({ example: true, description: 'The category takes a front / rear choice' })
  side_choice!: boolean;

  @ApiProperty({ type: String, example: 'Fox 38 Factory Grip2', nullable: true })
  component_desc!: string | null;

  @ApiProperty({ type: String, example: 'front', nullable: true })
  position!: string | null;

  @ApiProperty({ type: String, example: 'Mounted after spring service', nullable: true })
  note!: string | null;

  @ApiProperty({ type: Date, example: '2024-04-01T00:00:00.000Z', nullable: true })
  mounted_at!: Date | null;

  @ApiProperty({ type: Date, example: null, nullable: true, description: 'The day the part came off' })
  removed_at!: Date | null;

  @ApiProperty({ type: Boolean, example: true, nullable: true })
  is_active!: boolean | null;

  @ApiProperty({ type: Number, example: 1200, nullable: true })
  total_km!: number | null;

  @ApiProperty({ type: Number, example: 480, nullable: true })
  total_time_min!: number | null;

  @ApiProperty({ type: Number, example: 800, nullable: true })
  drivetrain_km!: number | null;

  @ApiProperty({ type: Number, example: 480, nullable: true })
  suspension_min!: number | null;

  @ApiProperty({ type: Number, example: 85, nullable: true })
  health_index!: number | null;

  @ApiProperty({
    example: true,
    description:
      'The bike watches a wear index on this kind of part, so the reading is one to show. Decided by the service intervals the bike carries',
  })
  tracks_health_index!: boolean;

  @ApiProperty({
    type: Date,
    example: '2025-06-10T00:00:00.000Z',
    nullable: true,
    description: 'The most recent Service that worked on this part; null for one nobody has serviced',
  })
  last_service_at!: Date | null;

  @ApiProperty({
    example: true,
    description:
      'No Service has recorded work against the part, so its wear may still be corrected and the row deleted',
  })
  unserviced!: boolean;
}

// One of the owner's own catalogue entries, as the settings list reads it. The counts are
// what the list says out loud before a type is removed: removing it never touches the parts
// still carrying its name (ADR 0021).
export class Response_CustomComponentTypeDto {
  @ApiProperty({ example: 91 })
  id!: number;

  @ApiProperty({ example: 'Chain Guard' })
  component_type!: string;

  @ApiProperty({ example: 3 })
  component_group_id!: number;

  @ApiProperty({ example: 'Drivetrain' })
  component_group!: string;

  @ApiProperty({ type: String, example: 'componentGroup.drivetrain', nullable: true })
  component_group_i18n_key!: string | null;

  @ApiProperty({ example: 2, description: 'Parts on the owner bikes still named by this type' })
  parts_in_use!: number;

  @ApiProperty({ example: 1, description: 'How many bikes those parts sit on' })
  bikes_in_use!: number;
}
