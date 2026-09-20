import { ApiProperty } from '@nestjs/swagger';
import { profile_visibility } from '@prisma/client';
import { PROFILE_RELATIONS, ProfileRelation } from '../../profile/dto/response-profile-garage.dto';

// Where I stand with a person in a list: what the profile reads, less the one that is me.
export const FOLLOWING_ROW_RELATIONS = PROFILE_RELATIONS.filter((relation) => relation !== 'SELF');
export type FollowingRowRelation = Exclude<ProfileRelation, 'SELF'>;

// One person on my outgoing side - a search result or somebody I follow. Only what names and
// draws the row: never the email, the Google id, the Strava fields or anything of the garage.
export class FollowingRowDto {
  @ApiProperty({ example: 'jarda-novak' })
  handle!: string;

  @ApiProperty({ example: 'Jarda Novák', nullable: true })
  name!: string | null;

  @ApiProperty({ example: 'https://lh3.googleusercontent.com/a/photo', nullable: true })
  avatar_url!: string | null;

  // Lets the following list mark a profile that went Off.
  @ApiProperty({ enum: profile_visibility, example: 'PUBLIC' })
  visibility!: profile_visibility;

  @ApiProperty({ enum: FOLLOWING_ROW_RELATIONS, example: 'NONE' })
  relation!: FollowingRowRelation;
}

// GET /follows/search: the first 20 matches, and whether a 21st existed.
export class ResponseFollowSearchDto {
  @ApiProperty({ type: [FollowingRowDto] })
  results!: FollowingRowDto[];

  @ApiProperty({ example: false, description: 'True when more matched than the 20 answered' })
  capped!: boolean;
}
