import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsNumber, MaxLength } from 'class-validator';

export class UpdateBikeEventDto {
  @IsOptional()
  @IsInt()
  @ApiProperty({ example: 1, nullable: true })
  bike_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({ example: 'Updated service note', nullable: true })
  note?: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ example: 200.00, nullable: true })
  total_cost?: number;
}
