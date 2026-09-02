import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateMountedComponentsDto } from './create-components';

export class UpdateComponentsDto extends PartialType(CreateMountedComponentsDto) {}

// Correcting a Mounted Component. The kind of part it is and the bike it sits on are not
// corrections — changing either would be a different part, or a different bike's build.
export class UpdateMountedComponentDto {
  @IsOptional()
  @ApiProperty({ type: String, example: 'Fox 38 Factory Grip2', required: false, nullable: true })
  @IsString({ message: 'Component description must be text' })
  @MaxLength(400, { message: 'Component desc must be at most $constraint1 characters' })
  component_desc?: string | null;

  @IsOptional()
  @ApiProperty({ type: String, example: 'front', required: false, nullable: true })
  @IsString()
  position?: string | null;

  // Refused against a part a Service has touched, along with every accumulator below.
  @IsOptional()
  @ApiProperty({ example: '2024-04-01T00:00:00.000Z', required: false, nullable: true })
  @IsDateString()
  mounted_at?: Date;

  @IsOptional()
  @ApiProperty({ example: 2000, required: false, nullable: true })
  @IsInt()
  total_km?: number;

  @IsOptional()
  @ApiProperty({ example: 900, required: false, nullable: true })
  @IsInt()
  total_time_min?: number;

  @IsOptional()
  @ApiProperty({ example: 800, required: false, nullable: true })
  @IsInt()
  drivetrain_km?: number;

  @IsOptional()
  @ApiProperty({ example: 480, required: false, nullable: true })
  @IsInt()
  suspension_min?: number;
}

// Taking a part off with nothing fitted in its place. The date defaults to now, so a part
// removed last month is not recorded as coming off today only when the owner says so.
export class DismountComponentDto {
  @IsOptional()
  @ApiProperty({ example: '2025-02-02T00:00:00.000Z', required: false, nullable: true })
  @IsDateString()
  removed_at?: Date;
}
