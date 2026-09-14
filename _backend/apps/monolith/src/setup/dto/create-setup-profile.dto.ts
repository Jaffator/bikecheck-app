import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString, Length } from 'class-validator';

// Trims what the owner typed, so " Trail" and "Trail" are one name (the unique key is the stored string).
export const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// A new Setup Profile: blank, or a copy of another profile of the same bike. The numbers are not
// sent here - a profile is written down through PATCH once it exists (ADR 0029).
export class CreateSetupProfileDto {
  @ApiProperty({ example: 'Trail', minLength: 1, maxLength: 50 })
  @Transform(trimString)
  @IsString()
  @Length(1, 50)
  name!: string;

  // A profile of the same bike; one of another bike is not found.
  @ApiProperty({ example: 12, required: false, description: 'Profile to copy every number and the note from' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  copy_of?: number;
}
