import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested, IsString } from 'class-validator';
import { CreateMountedComponentsDto } from '../../component/dto/create-components';
import { components_mounted } from '@prisma/client';

export class AssembleBikeComponentsDto {
  @ApiProperty({ type: () => CreateMountedComponentsDto })
  @ValidateNested()
  @Type(() => CreateMountedComponentsDto)
  component!: CreateMountedComponentsDto;

  @ApiProperty({ example: 'Fork' })
  @IsString()
  component_name!: string;
}

export class Response_MountedComponentsDto implements components_mounted {
  @ApiProperty({ example: 5000, nullable: true })
  mileage_at_last_service_km!: number | null;

  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  bike_id!: number;

  @ApiProperty({ example: 12, nullable: true })
  component_type_id!: number;

  @ApiProperty({ example: 'rear', nullable: true })
  position!: string | null;

  @ApiProperty({ example: '2026-03-26T10:00:00.000Z', nullable: true })
  mounted_at!: Date | null;

  @ApiProperty({ example: null, nullable: true })
  removed_at!: Date | null;

  @ApiProperty({ example: '2026-03-26T10:00:00.000Z', nullable: true })
  updated_at!: Date | null;

  @ApiProperty({ example: '2026-03-26T10:00:00.000Z', nullable: true })
  created_at!: Date | null;

  @ApiProperty({ example: 1200, nullable: true })
  total_mileage_km!: number | null;

  @ApiProperty({ example: 'Mounted after spring service', nullable: true })
  note!: string | null;

  @ApiProperty({ example: true, nullable: true })
  is_active!: boolean | null;

  @ApiProperty({ example: 350, nullable: true })
  brake_load_since_service!: number | null;

  @ApiProperty({ example: '2026-03-20T10:00:00.000Z', nullable: true })
  last_serviced_at!: Date | null;

  @ApiProperty({ example: false, nullable: true })
  is_deleted!: boolean | null;

  @ApiProperty({ example: null, nullable: true })
  deleted_at!: Date | null;

  @ApiProperty({ example: 'Fox 38 Factory Grip2', nullable: true })
  component_desc!: string | null;

  @ApiProperty({ example: 1200, nullable: true })
  total_minutes_used!: number | null;

  @ApiProperty({ example: 350, nullable: true })
  minutes_since_last_service!: number | null;
}

export class Response_ComponentGroupDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Drivetrain' })
  group_name!: string;

  @ApiProperty({ example: false })
  side_choice!: boolean;
}

export class Response_ComponentDto {
  @ApiProperty({ example: 15 })
  component_group_id!: number;

  @ApiProperty({ example: 1 })
  user_id!: number | null;

  @ApiProperty({ example: 'Custom Component Name' })
  component_type!: string;

  @ApiProperty({ example: false })
  ebike!: boolean;

  @ApiProperty({ example: true })
  has_position!: boolean;
}
