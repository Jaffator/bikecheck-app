import { ApiProperty, OmitType } from '@nestjs/swagger';
import { profile_visibility, tire_pressure_unit } from '@prisma/client';
import { PROFILE_RELATIONS, ProfileBikeCardDto, ProfileOwnerDto, ProfileRelation } from './response-profile-garage.dto';

// A catalogue entry as the page names it: the key for the frontend to translate, the
// stored name when it is the owner's own.
export class ProfileCatalogueNameDto {
  @ApiProperty({ example: 'component.fork', nullable: true })
  i18n_key!: string | null;

  @ApiProperty({ example: 'Fork' })
  name!: string;
}

// One part on the bike, as a reader may know it. Never its note, never its health index.
export class ProfileMountedPartDto {
  @ApiProperty({ example: 55 })
  id!: number;

  @ApiProperty({ type: ProfileCatalogueNameDto })
  type!: ProfileCatalogueNameDto;

  @ApiProperty({ example: 'Fox 38 Factory GRIP2', nullable: true, description: 'What the owner called it' })
  description!: string | null;

  @ApiProperty({ example: 'front', nullable: true })
  position!: string | null;

  // Wear since mounted; null when nothing is on record.
  @ApiProperty({ example: 1200, nullable: true })
  distance_km!: number | null;

  @ApiProperty({ example: 4800, nullable: true })
  time_min!: number | null;
}

export class ProfileComponentGroupDto {
  @ApiProperty({ type: ProfileCatalogueNameDto })
  category!: ProfileCatalogueNameDto;

  @ApiProperty({ type: [ProfileMountedPartDto] })
  parts!: ProfileMountedPartDto[];
}

// Clicks from fully closed on every adjuster (ADR 0029).
export class ProfileClicksDto {
  @ApiProperty({ example: 8, nullable: true })
  rebound_ls!: number | null;

  @ApiProperty({ example: 3, nullable: true })
  rebound_hs!: number | null;

  @ApiProperty({ example: 10, nullable: true })
  compression_ls!: number | null;

  @ApiProperty({ example: 2, nullable: true })
  compression_hs!: number | null;
}

// One leg of the suspension - the fork or the shock - always in psi.
export class ProfileLegDto {
  @ApiProperty({ example: 85, nullable: true })
  pressure_psi!: number | null;

  @ApiProperty({ example: 20, nullable: true })
  sag_percent!: number | null;

  @ApiProperty({ example: 2, nullable: true })
  tokens!: number | null;

  @ApiProperty({ type: ProfileClicksDto })
  clicks!: ProfileClicksDto;
}

// One Setup Profile of the bike, its note left behind. Tyres in psi - the frontend converts
// to the owner's unit; the mounted tyre under each only while components are shared.
export class ProfileSetupProfileDto {
  @ApiProperty({ example: 12 })
  id!: number;

  @ApiProperty({ example: 'Trail' })
  name!: string;

  @ApiProperty({ example: true, description: 'The profile the bike is ridden at; exactly one, listed first' })
  is_active!: boolean;

  @ApiProperty({ example: 24.5, nullable: true })
  front_tire_psi!: number | null;

  @ApiProperty({ example: 27, nullable: true })
  rear_tire_psi!: number | null;

  @ApiProperty({ type: ProfileMountedPartDto, nullable: true })
  front_tire!: ProfileMountedPartDto | null;

  @ApiProperty({ type: ProfileMountedPartDto, nullable: true })
  rear_tire!: ProfileMountedPartDto | null;

  @ApiProperty({ type: ProfileLegDto, nullable: true, description: 'null unless has_front_suspension' })
  fork!: ProfileLegDto | null;

  @ApiProperty({ type: ProfileLegDto, nullable: true, description: 'null unless has_rear_suspension' })
  shock!: ProfileLegDto | null;
}

// A sum of money in the owner's currency; the frontend writes it for the reader's language.
export class ProfileMoneyDto {
  @ApiProperty({ example: 1200 })
  amount!: number;

  @ApiProperty({ example: 'CZK' })
  currency!: string;
}

// One Service as a reader may know it: when, what was done, what it touched. Never its
// note, its actions' notes, their prices or its attachments. The cost travels only with
// share_costs and a recorded price - otherwise the key is absent, not null.
export class ProfileServiceDto {
  @ApiProperty({ example: 88 })
  id!: number;

  @ApiProperty({ example: '2026-08-15T00:00:00.000Z', nullable: true, description: 'Service Date' })
  date!: string | null;

  @ApiProperty({ example: true, description: 'Any of its actions swapped a part out' })
  is_replacement!: boolean;

  @ApiProperty({ type: [ProfileCatalogueNameDto] })
  actions!: ProfileCatalogueNameDto[];

  @ApiProperty({ type: [ProfileCatalogueNameDto], description: 'Component types touched, each once' })
  parts!: ProfileCatalogueNameDto[];

  @ApiProperty({ type: ProfileMoneyDto, required: false })
  cost?: ProfileMoneyDto;
}

// History Totals over the bike's whole record; spend only with share_costs.
export class ProfileHistoryTotalsDto {
  @ApiProperty({ example: 26 })
  services!: number;

  @ApiProperty({ example: 9, description: 'Replacements counted per part, not per Service (ADR 0003)' })
  replacements!: number;

  @ApiProperty({ type: ProfileMoneyDto, required: false })
  spend?: ProfileMoneyDto;
}

// The bike's service history: the totals and the first page, newest first, undated last.
export class ProfileHistoryDto {
  @ApiProperty({ type: ProfileHistoryTotalsDto })
  totals!: ProfileHistoryTotalsDto;

  @ApiProperty({ type: [ProfileServiceDto] })
  services!: ProfileServiceDto[];

  @ApiProperty({ example: 26, description: 'Every Service of the bike, ignoring the page' })
  total_count!: number;
}

// What GET /profiles/:handle/bikes/:id/services answers: one page of older Services.
export class ResponseProfileServicesDto {
  @ApiProperty({ type: [ProfileServiceDto] })
  services!: ProfileServiceDto[];

  @ApiProperty({ example: 26 })
  total_count!: number;
}

// The bike page: the card plus what the hero reads, and the sections the switches let out.
// A section that is off is null, never []; setup: [] is a bike with no profile yet. The
// card's parts count gives way to the section itself - the page counts the groups.
export class ProfileBikeDto extends OmitType(ProfileBikeCardDto, ['components'] as const) {
  @ApiProperty({ example: 15000 })
  time_min!: number;

  @ApiProperty({ example: false })
  ebike!: boolean;

  @ApiProperty({ example: 'carbon', nullable: true })
  frame_material!: string | null;

  @ApiProperty({ example: true })
  has_front_suspension!: boolean;

  @ApiProperty({ example: true })
  has_rear_suspension!: boolean;

  @ApiProperty({ type: [ProfileComponentGroupDto], nullable: true, description: 'null = section off' })
  components!: ProfileComponentGroupDto[] | null;

  @ApiProperty({
    type: [ProfileSetupProfileDto],
    nullable: true,
    description: 'null = section off; [] = no profile yet',
  })
  setup!: ProfileSetupProfileDto[] | null;

  @ApiProperty({ type: ProfileHistoryDto, nullable: true, description: 'null = section off' })
  history!: ProfileHistoryDto | null;
}

// What GET /profiles/:handle/bikes/:id answers. No header exception: not readable is 404.
export class ResponseProfileBikeDto {
  @ApiProperty({ type: ProfileOwnerDto })
  owner!: ProfileOwnerDto;

  @ApiProperty({ enum: profile_visibility, example: profile_visibility.PUBLIC })
  visibility!: profile_visibility;

  @ApiProperty({ enum: PROFILE_RELATIONS, example: 'NONE' })
  relation!: ProfileRelation;

  @ApiProperty({ example: 'CZK' })
  currency!: string;

  @ApiProperty({ enum: tire_pressure_unit, example: tire_pressure_unit.bar })
  tire_pressure_unit!: tire_pressure_unit;

  @ApiProperty({ type: ProfileBikeDto })
  bike!: ProfileBikeDto;
}
