import { ApiProperty } from '@nestjs/swagger';

// Report metadata for the owner's management list (no heavy snapshot payload).
export class ResponseReportDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'b1f7c0e2-2a3d-4e5f-8a9b-0c1d2e3f4a5b' })
  public_token!: string;

  @ApiProperty({ example: 'https://app.bikecheck.com/r/b1f7c0e2-2a3d-4e5f-8a9b-0c1d2e3f4a5b' })
  share_url!: string;

  @ApiProperty({ example: 42 })
  bike_id!: number;

  @ApiProperty({ example: 3 })
  view_count!: number;

  @ApiProperty({ example: null, nullable: true })
  last_viewed_at!: Date | null;

  @ApiProperty({ example: false })
  revoked!: boolean;

  @ApiProperty({ example: null, nullable: true })
  expires_at!: Date | null;

  @ApiProperty({ example: '2026-06-23T12:00:00.000Z' })
  created_at!: Date;
}
