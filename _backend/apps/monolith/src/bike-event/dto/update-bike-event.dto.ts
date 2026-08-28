import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Actions_BikeEventDto, Attachment_BikeEventDto, Replaced_ComponentsDto } from './create-bike-event.dto';

// A correction to an Action already on the Service. Only the fields a receipt can turn
// out to have got wrong - what the Action was, and what it touched, cannot change.
export class Update_ActionDoneDto {
  @IsInt()
  @ApiProperty({ example: 500, description: 'event_actions_done id, as returned by the detail endpoint' })
  action_done_id!: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ example: 150, required: false })
  partial_cost?: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'Shimano XT chain, not the SLX', required: false })
  description?: string;
}

// Everything a user may correct after the fact. Omitting a field leaves it as it was;
// actions_done and actions_replaced add to the Service rather than replacing what is on it.
export class Update_BikeEventDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  @ApiProperty({ example: 'Bike Shop XY, next time check the bearing', required: false })
  note?: string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ example: 2400, required: false })
  total_cost?: number;

  // Moving this re-runs the wear calculation for every Action on the Service - see ADR 0001.
  @IsDateString()
  @IsOptional()
  @ApiProperty({ example: '2026-07-01T00:00:00.000Z', required: false })
  service_date?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Update_ActionDoneDto)
  @ApiProperty({ type: [Update_ActionDoneDto], required: false })
  actions_updated?: Update_ActionDoneDto[];

  // Refused for an Action that replaced a part: the component it created may already carry
  // rides, later services, or its own replacement - see ADR 0003.
  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  @ApiProperty({ example: [501], type: [Number], required: false, description: 'event_actions_done ids to remove' })
  actions_removed?: number[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Actions_BikeEventDto)
  @ApiProperty({ type: [Actions_BikeEventDto], required: false, description: 'Actions to add to this Service' })
  actions_done?: Actions_BikeEventDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Replaced_ComponentsDto)
  @ApiProperty({ type: [Replaced_ComponentsDto], required: false, description: 'Replacements to add to this Service' })
  actions_replaced?: Replaced_ComponentsDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Attachment_BikeEventDto)
  @ApiProperty({ type: [Attachment_BikeEventDto], required: false })
  attachments_added?: Attachment_BikeEventDto[];

  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  @ApiProperty({ example: [3], type: [Number], required: false, description: 'bike_event_attachments ids to remove' })
  attachments_removed?: number[];
}
