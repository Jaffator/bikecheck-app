import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { trimString } from './create-setup-profile.dto';

// Rewriting a Setup Profile in place. Any subset of the sheet: a field sent as null clears it, a
// field not sent is untouched. Only the name can never be null - a profile is always named.
// Nothing caps a click count: the dial's range is the dial's, not a fact about the fork.
export class UpdateSetupProfileDto {
  @ApiProperty({ example: 'Race', required: false, minLength: 1, maxLength: 50 })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @Transform(trimString)
  @IsString()
  @Length(1, 50)
  name?: string;

  @ApiProperty({ example: 'Wet, muddy Loket', required: false, nullable: true, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;

  // Tyres, in psi - the frontend converts from the owner's Tyre Pressure Unit.
  @ApiProperty({ example: 24.5, required: false, nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  front_tire_psi?: number | null;

  @ApiProperty({ example: 27.0, required: false, nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  rear_tire_psi?: number | null;

  // Fork
  @ApiProperty({ example: 85.0, required: false, nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  fork_pressure_psi?: number | null;

  @ApiProperty({ example: 2, required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  fork_tokens?: number | null;

  @ApiProperty({ example: 20, required: false, nullable: true, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  fork_sag_percent?: number | null;

  @ApiProperty({ example: 8, required: false, nullable: true, description: 'Clicks from fully closed' })
  @IsOptional()
  @IsInt()
  @Min(0)
  fork_rebound_ls?: number | null;

  @ApiProperty({ example: 3, required: false, nullable: true, description: 'Clicks from fully closed' })
  @IsOptional()
  @IsInt()
  @Min(0)
  fork_rebound_hs?: number | null;

  @ApiProperty({ example: 10, required: false, nullable: true, description: 'Clicks from fully closed' })
  @IsOptional()
  @IsInt()
  @Min(0)
  fork_compression_ls?: number | null;

  @ApiProperty({ example: 2, required: false, nullable: true, description: 'Clicks from fully closed' })
  @IsOptional()
  @IsInt()
  @Min(0)
  fork_compression_hs?: number | null;

  // Shock
  @ApiProperty({ example: 185.0, required: false, nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  shock_pressure_psi?: number | null;

  @ApiProperty({ example: 1, required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  shock_tokens?: number | null;

  @ApiProperty({ example: 30, required: false, nullable: true, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  shock_sag_percent?: number | null;

  @ApiProperty({ example: 6, required: false, nullable: true, description: 'Clicks from fully closed' })
  @IsOptional()
  @IsInt()
  @Min(0)
  shock_rebound_ls?: number | null;

  @ApiProperty({ example: 2, required: false, nullable: true, description: 'Clicks from fully closed' })
  @IsOptional()
  @IsInt()
  @Min(0)
  shock_rebound_hs?: number | null;

  @ApiProperty({ example: 9, required: false, nullable: true, description: 'Clicks from fully closed' })
  @IsOptional()
  @IsInt()
  @Min(0)
  shock_compression_ls?: number | null;

  @ApiProperty({ example: 1, required: false, nullable: true, description: 'Clicks from fully closed' })
  @IsOptional()
  @IsInt()
  @Min(0)
  shock_compression_hs?: number | null;
}
