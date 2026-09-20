import { ApiProperty } from '@nestjs/swagger';
import { profile_visibility } from '@prisma/client';

export class ProfileStatsDto {
  @ApiProperty({ example: 128 })
  views!: number;

  // Accepted followers. Requests answer 0 until Follow Requests land (#146).
  @ApiProperty({ example: 3 })
  followers!: number;

  @ApiProperty({ example: 0 })
  pending_requests!: number;
}

// The owner's Public Profile settings. Without a row yet: the OFF defaults, no handle and a
// suggested one - nothing is written until the owner confirms.
export class ResponseProfileDto {
  @ApiProperty({ example: 'jarda-novak', nullable: true })
  handle!: string | null;

  @ApiProperty({ enum: profile_visibility, example: profile_visibility.OFF })
  visibility!: profile_visibility;

  @ApiProperty({ example: true })
  share_components!: boolean;

  @ApiProperty({ example: true })
  share_setup!: boolean;

  @ApiProperty({ example: true })
  share_history!: boolean;

  @ApiProperty({ example: false })
  share_costs!: boolean;

  @ApiProperty({ type: ProfileStatsDto })
  stats!: ProfileStatsDto;

  @ApiProperty({ example: 'jarda-novak', nullable: true, description: 'Only while no row exists' })
  suggested_handle!: string | null;

  // The drawer composes `${public_origin}/u/${handle}` for the address it shows and copies.
  @ApiProperty({ example: 'https://app.bikecheck.cloud' })
  public_origin!: string;
}
