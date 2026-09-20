import { ApiProperty } from '@nestjs/swagger';
import { PROFILE_RELATIONS, ProfileRelation } from '../../profile/dto/response-profile-garage.dto';

// The relations a follows row stands in, from the follower's side: what the profile reads,
// less the two that need no row.
export const FOLLOW_RELATIONS = PROFILE_RELATIONS.filter((relation) => relation !== 'SELF' && relation !== 'NONE');
export type FollowRelation = Exclude<ProfileRelation, 'SELF' | 'NONE'>;

// What POST /follows/:handle answers: the relation now standing, so the button flips
// without a refetch. The same on a second POST - an existing row is left as it is.
export class ResponseFollowDto {
  @ApiProperty({ enum: FOLLOW_RELATIONS, example: 'FOLLOWING' })
  relation!: FollowRelation;
}
