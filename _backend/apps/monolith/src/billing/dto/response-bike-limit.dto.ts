import { ApiProperty } from '@nestjs/swagger';

export class ResponseBikeLimitDto {
  @ApiProperty({ example: 1, description: 'How many Bikes the account may hold' })
  bike_limit!: number;

  @ApiProperty({ example: 1, description: 'Bikes counted against the limit, archived ones included' })
  bike_count!: number;

  @ApiProperty({ example: false, description: 'True when an Archived Bike is among the counted' })
  has_archived_bikes!: boolean;
}
