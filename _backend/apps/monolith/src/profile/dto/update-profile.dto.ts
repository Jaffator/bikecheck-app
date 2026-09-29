import { ApiProperty } from '@nestjs/swagger';
import { profile_visibility } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

// Any subset of the Public Profile settings. The handle's own rules (length, characters,
// reserved, taken) are the service's, so each refusal carries its reason code.
export class UpdateProfileDto {
  @ApiProperty({ example: 'jarda-novak', required: false, description: 'Stored lowercase' })
  @IsOptional()
  @IsString()
  handle?: string;

  @ApiProperty({ enum: profile_visibility, required: false })
  @IsOptional()
  @IsEnum(profile_visibility)
  visibility?: profile_visibility;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  share_components?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  share_setup?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  share_history?: boolean;

  @ApiProperty({ example: false, required: false, description: 'Meaningful only with share_history' })
  @IsOptional()
  @IsBoolean()
  share_costs?: boolean;
}
