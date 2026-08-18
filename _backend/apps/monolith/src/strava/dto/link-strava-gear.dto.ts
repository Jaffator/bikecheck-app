import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

export class GearLinkDto {
  // Null unpairs the bike: it stops collecting new rides, but the ones it already
  // has stay — they were really ridden, and component wear is derived from them.
  @ApiProperty({ example: 'b1234567', nullable: true })
  @IsOptional()
  @IsString()
  stravaBikeId!: string | null;

  @ApiProperty({ example: 1 })
  @IsInt()
  bikecheckBikeId!: number;
}

export class LinkStravaGearDto {
  @ApiProperty({ type: GearLinkDto, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => GearLinkDto)
  links!: GearLinkDto[];
}
