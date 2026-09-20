import { ApiProperty } from '@nestjs/swagger';
import { profile_visibility, tire_pressure_unit } from '@prisma/client';

// Where the viewer stands with the owner. Follow (PRD 2) adds PENDING and FOLLOWING.
export const PROFILE_RELATIONS = ['SELF', 'NONE'] as const;
export type ProfileRelation = (typeof PROFILE_RELATIONS)[number];

// The owner as the page names them - and nothing else of the users row.
export class ProfileOwnerDto {
  @ApiProperty({ example: 'jarda-novak' })
  handle!: string;

  @ApiProperty({ example: 'Jarda Novák', nullable: true })
  name!: string | null;

  @ApiProperty({ example: 'https://lh3.googleusercontent.com/a/photo', nullable: true })
  avatar_url!: string | null;
}

export class ProfileSharesDto {
  @ApiProperty({ example: true })
  components!: boolean;

  @ApiProperty({ example: true })
  setup!: boolean;

  @ApiProperty({ example: true })
  history!: boolean;

  @ApiProperty({ example: false })
  costs!: boolean;
}

// Over the listed bikes only. A count is null when its section is off, not zero.
export class ProfileTotalsDto {
  @ApiProperty({ example: 3 })
  bikes!: number;

  @ApiProperty({ example: 12480 })
  distance_km!: number;

  @ApiProperty({ example: 32, nullable: true })
  components!: number | null;

  @ApiProperty({ example: 26, nullable: true })
  services!: number | null;
}

export class ProfileBikeTypeDto {
  @ApiProperty({ example: 'bikeType.enduro', nullable: true })
  i18n_key!: string | null;

  @ApiProperty({ example: 'Enduro' })
  name!: string;
}

// One card on the garage page: the bike and the counts the switches let out.
export class ProfileBikeCardDto {
  @ApiProperty({ example: 15 })
  id!: number;

  @ApiProperty({ example: 'Rallon', nullable: true, description: 'The nickname its owner gave it' })
  name!: string | null;

  @ApiProperty({ example: 'Orbea' })
  brand!: string;

  @ApiProperty({ example: 'Rallon M10', nullable: true })
  model!: string | null;

  @ApiProperty({ example: 2024, nullable: true })
  year!: number | null;

  @ApiProperty({ type: ProfileBikeTypeDto, nullable: true })
  type!: ProfileBikeTypeDto | null;

  @ApiProperty({ example: 'https://storage.example.com/bikes/rallon.webp', nullable: true })
  image_url!: string | null;

  @ApiProperty({ example: 4187 })
  distance_km!: number;

  @ApiProperty({ example: 32, nullable: true })
  components!: number | null;

  @ApiProperty({ example: 26, nullable: true })
  services!: number | null;
}

export class ProfileGarageDto {
  // Last Updated: the newest of the profile, its Shared Bikes, their parts and Services.
  @ApiProperty({ example: '2026-09-12T00:00:00.000Z' })
  updated_at!: string;

  @ApiProperty({ type: ProfileSharesDto })
  shares!: ProfileSharesDto;

  @ApiProperty({ type: ProfileTotalsDto })
  totals!: ProfileTotalsDto;

  @ApiProperty({ example: 'CZK' })
  currency!: string;

  @ApiProperty({ enum: tire_pressure_unit, example: tire_pressure_unit.bar })
  tire_pressure_unit!: tire_pressure_unit;

  @ApiProperty({ type: [ProfileBikeCardDto] })
  bikes!: ProfileBikeCardDto[];
}

// What GET /profiles/:handle answers: always the header, the garage only when the read
// rule allows. OFF reaches nobody but the owner, whose preview has to know the state.
export class ResponseProfileGarageDto {
  @ApiProperty({ type: ProfileOwnerDto })
  owner!: ProfileOwnerDto;

  @ApiProperty({ enum: profile_visibility, example: profile_visibility.PUBLIC })
  visibility!: profile_visibility;

  @ApiProperty({ enum: PROFILE_RELATIONS, example: 'NONE' })
  relation!: ProfileRelation;

  @ApiProperty({ type: ProfileGarageDto, nullable: true, description: 'null = header only' })
  garage!: ProfileGarageDto | null;
}

// What GET /profiles/public/:handle answers: the app's shape with the garage always on it -
// whatever the web rule closes is a 404, never a header.
export class ResponsePublicProfileGarageDto extends ResponseProfileGarageDto {
  @ApiProperty({ type: ProfileGarageDto })
  declare garage: ProfileGarageDto;
}
