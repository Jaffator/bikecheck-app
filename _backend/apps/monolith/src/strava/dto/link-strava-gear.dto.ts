import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, IsString, ValidateNested } from 'class-validator';

export class GearLinkDto {
  @ApiProperty({ example: 'b1234567' })
  @IsString()
  stravaBikeId!: string;

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
