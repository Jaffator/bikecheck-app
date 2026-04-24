import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsNumber, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateBikeEventDto {
  @IsInt()
  @ApiProperty({ example: 1 })
  bike_id!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({ example: 'Replaced chain and cleaned drivetrain', nullable: true })
  note?: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ example: 150.5, nullable: true })
  total_cost?: number;
}

export class ActionsComponentsGroupDto {
  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ example: 13 })
  group_id!: number;

  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ example: 141 })
  bike_id!: number;
}
