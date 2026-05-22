import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsNumber,
  MaxLength,
  IsNotEmpty,
  IsPositive,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Replaced components during bike event, e.g. "Replaced chain", "Replaced brake pads", etc.
export class Replaced_ComponentsDto {
  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ example: 45 })
  old_component_mounted_id!: number; // která se mění

  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ example: 16 })
  component_type_id!: number; // typ nové komponenty

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Shimano XT Chain HG-701' })
  new_component_desc!: string; // popis nové

  @IsNumber()
  @IsOptional()
  @ApiProperty({ example: 150 })
  partial_cost?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Old chain worn out' })
  note?: string;

  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ example: 2 })
  action_id!: number; // jaká akce (např. "Chain Replacement")
}

// Done Actions for components, e.g. "Bleed brake", "Replace chain", etc.
export class Actions_BikeEventDto {
  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ example: 1 })
  action_id!: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Replaced chain' })
  description!: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ example: 50 })
  partial_cost!: number;

  @IsBoolean()
  @IsNotEmpty()
  @ApiProperty({ example: false })
  part_replaced!: boolean;

  @IsInt({ each: true })
  @ApiProperty({ example: [15, 16], description: 'IDs of components involved in this action' })
  mounted_components_involved!: number[]; // IDs of components involved in this action (for reference)
}

// Attachment for bike event, e.g. invoice, photo, pdf, etc.
export class Attachment_BikeEventDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'faktura.pdf' })
  name?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'application/pdf' })
  content_type?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'https://cdn.example.com/files/faktura.pdf' })
  url?: string;
}

export class Actions_OnGroupDto {
  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ example: 1 })
  bike_id!: number;

  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ example: 2 })
  group_id!: number;
}

export class Create_BikeEventDto {
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  @ApiProperty({ example: 15 })
  bike_id!: number;

  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  @ApiProperty({ example: 15 })
  total_cost!: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Attachment_BikeEventDto)
  @ApiProperty({ type: [Attachment_BikeEventDto], nullable: true })
  attachment?: Attachment_BikeEventDto[];

  @IsString()
  @MaxLength(500)
  @ApiProperty({ example: 'Replaced chain and cleaned drivetrain', nullable: true })
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Actions_BikeEventDto)
  @ApiProperty({ type: [Actions_BikeEventDto] })
  actions_done!: Actions_BikeEventDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Replaced_ComponentsDto)
  actions_replaced?: Replaced_ComponentsDto[];
}
