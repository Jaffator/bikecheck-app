import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { Prisma } from '@prisma/client';

export class CreateMountedComponentsDto implements Prisma.components_mountedUncheckedCreateInput {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  bike_id!: number;

  @IsOptional()
  @ApiProperty({ example: 12 })
  @IsInt()
  @IsPositive()
  component_type_id?: number;

  @ApiProperty({ example: 'Bearing' })
  @IsOptional()
  @IsString()
  custom_component_type?: string;

  @IsOptional()
  @ApiProperty({ example: 'Fox 38 Factory Grip2', required: false, nullable: true })
  @IsString()
  @MaxLength(255)
  component_desc?: string | null;

  @IsOptional()
  @ApiProperty({ example: 'Front', required: false, nullable: true })
  @IsString()
  position?: string;

  @IsOptional()
  @ApiProperty({ example: '2026-03-26T10:00:00.000Z', required: false, nullable: true })
  @IsDateString()
  mounted_at?: Date;

  @IsOptional()
  @ApiProperty({ example: 1200, required: false, nullable: true })
  @IsInt()
  @IsPositive()
  total_mileage_km?: number;

  @IsOptional()
  @ApiProperty({ example: true, required: false, nullable: true })
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @ApiProperty({ example: 'Mounted after spring service', required: false, nullable: true })
  @IsString()
  @MaxLength(255)
  note?: string | null;

  @IsOptional()
  @ApiProperty({ example: 2, required: false, nullable: true })
  @IsInt()
  @IsPositive()
  interval_id?: number;

  @IsOptional()
  @ApiProperty({ example: 350, required: false, nullable: true })
  @IsInt()
  @IsPositive()
  brake_load_since_service?: number;

  @IsOptional()
  @ApiProperty({ example: '2026-03-20T10:00:00.000Z', required: false, nullable: true })
  @IsDateString()
  last_serviced_at?: Date;
}
