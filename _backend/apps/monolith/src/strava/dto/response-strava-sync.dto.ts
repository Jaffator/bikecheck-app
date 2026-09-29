import { ApiProperty } from '@nestjs/swagger';

export class ResponseStravaSyncDto {
  // Rides handed to the pipeline; they land in a few seconds, not in this response.
  @ApiProperty({ example: 2 })
  queued!: number;

  @ApiProperty({ example: '2026-09-29T10:00:00.000Z' })
  synced_at!: Date;
}
