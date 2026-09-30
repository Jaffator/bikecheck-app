import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class ChangeRideBikeDto {
  // The user's bike the ride moves to.
  @ApiProperty({ example: 2 })
  @IsInt()
  bikeId!: number;
}
