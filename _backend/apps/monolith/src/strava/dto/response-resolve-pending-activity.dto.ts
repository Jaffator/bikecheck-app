import { ApiProperty } from '@nestjs/swagger';

export class ResponseResolvePendingActivityDto {
  @ApiProperty({ example: true })
  success!: boolean;

  // The ride the pending activity became, so the client can save its check-in on it.
  @ApiProperty({ example: 42 })
  rideId!: number;
}
