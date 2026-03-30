import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateComponentsDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  bike_id!: number;

  @ApiProperty({ example: 12 })
  @IsInt()
  @IsPositive()
  component_type_id!: number;

  @ApiProperty({ example: 'Fox 38 Factory Grip2', required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  component_desc?: string;

  @ApiProperty({ example: '2026-03-26T10:00:00.000Z', required: false, nullable: true })
  @IsOptional()
  @IsDateString()
  mounted_at?: Date;

  @ApiProperty({ example: 1200, required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  total_mileage_km?: number;

  @ApiProperty({ example: true, required: false, nullable: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({ example: 'Mounted after spring service', required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @ApiProperty({ example: 2, required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  interval_id?: number;

  @ApiProperty({ example: 350, required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  brake_load_since_service?: number;

  @ApiProperty({ example: '2026-03-20T10:00:00.000Z', required: false, nullable: true })
  @IsOptional()
  @IsDateString()
  last_serviced_at?: Date;
}
