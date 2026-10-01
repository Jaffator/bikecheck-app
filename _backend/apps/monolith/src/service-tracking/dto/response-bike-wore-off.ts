import { ApiProperty } from '@nestjs/swagger';
import { Response_WoreOffLineDto } from './response-wore-off-line';

// What one ride wears off one bike, so the check-in can show it for whichever bike is picked.
export class Response_BikeWoreOffDto {
  @ApiProperty({ example: 7 })
  bike_id!: number;

  @ApiProperty({ type: [Response_WoreOffLineDto] })
  wore_off!: Response_WoreOffLineDto[];
}
