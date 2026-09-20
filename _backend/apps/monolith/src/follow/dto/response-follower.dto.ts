import { ApiProperty } from '@nestjs/swagger';
import { follow_status } from '@prisma/client';

// One person on my incoming side - somebody who asked or who follows. Keyed by user id,
// since a follower who never opened the share drawer has no handle. As the outgoing row,
// only what names them and draws the row: nothing private, nothing of a garage.
export class FollowerRowDto {
  @ApiProperty({ example: 42 })
  user_id!: number;

  @ApiProperty({ example: 'jarda-novak', nullable: true, description: 'Null for a follower with no profile' })
  handle!: string | null;

  @ApiProperty({ example: 'Jarda Novák', nullable: true })
  name!: string | null;

  @ApiProperty({ example: 'https://lh3.googleusercontent.com/a/photo', nullable: true })
  avatar_url!: string | null;

  // PENDING is a request waiting on me, ACCEPTED a follower.
  @ApiProperty({ enum: follow_status, example: 'PENDING' })
  status!: follow_status;

  @ApiProperty({ example: '2026-09-20T10:00:00.000Z', description: 'When they asked or followed' })
  created_at!: string;
}
