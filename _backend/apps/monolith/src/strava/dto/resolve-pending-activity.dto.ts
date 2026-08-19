import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class ResolvePendingActivityDto {
  // The BikeCheck bike the ride is being assigned to.
  @ApiProperty({ example: 1 })
  @IsInt()
  bikeId!: number;
}
