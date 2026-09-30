import { ApiProperty } from '@nestjs/swagger';
import { check_in_status, check_in_symptom } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export const CHECK_IN_NOTE_MAX_LENGTH = 500;

// How the bike rode; saving again overwrites the ride's one check-in.
export class SaveRideCheckInDto {
  @IsEnum(check_in_status)
  @ApiProperty({ enum: check_in_status })
  status!: check_in_status;

  // Kept only under ISSUE; the service drops them for OK.
  @IsOptional()
  @IsArray()
  @IsEnum(check_in_symptom, { each: true })
  @ApiProperty({ enum: check_in_symptom, isArray: true, required: false })
  symptoms?: check_in_symptom[];

  // Trimmed; a blank note is saved as none.
  @IsOptional()
  @IsString()
  @MaxLength(CHECK_IN_NOTE_MAX_LENGTH)
  @ApiProperty({ example: 'Skips on the 3rd cog', required: false })
  note?: string;
}
