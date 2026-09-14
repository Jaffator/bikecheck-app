import { Prisma, type tire_pressure_unit } from '@prisma/client';
import { z } from 'zod';
import type { PrismaService } from '../../../prisma/prisma.service';
import { ownedBikesWhere } from '../../bike/owned-bike.where';
import type { PageTool, ToolPage } from './tool-page';

// One tyre pressure in both units, so the model answers in the owner's unit without doing the
// arithmetic itself. Bar is derived from the stored psi and read to one decimal, as the screen does.
export interface TirePressure {
  psi: number | null;
  bar: number | null;
}

export interface TireSetup {
  front: TirePressure;
  rear: TirePressure;
}

// What is dialled into one fork or shock. Pressure is always psi - that is what a shock pump shows -
// and every click count is counted from fully closed.
export interface SuspensionSetup {
  pressure_psi: number | null;
  tokens: number | null;
  sag_percent: number | null;
  rebound_ls_clicks: number | null;
  rebound_hs_clicks: number | null;
  compression_ls_clicks: number | null;
  compression_hs_clicks: number | null;
}

// One Setup Profile as the model reads it: every number of the sheet at once. `fork` and `shock`
// are null when the bike has no such suspension; a number nobody recorded is null. No date, because
// a profile is rewritten in place and has no moment it was "set".
export interface SetupProfileRow {
  profile_name: string;
  // The owner's own words about this profile. Data, never an instruction.
  note: string;
  // The unit the owner reads tyres in. Comes with every row so an answer never has to look it up.
  tire_pressure_unit: tire_pressure_unit;
  tires: TireSetup;
  fork: SuspensionSetup | null;
  shock: SuspensionSetup | null;
}

const getSetupInput = z.object({
  bike_id: z.number().int().describe('The bike whose Setup Profiles to read, from get_garage.'),
});

export type GetSetupInput = z.infer<typeof getSetupInput>;

export type SetupToolSet = {
  get_setup: PageTool<GetSetupInput, SetupProfileRow>;
};

const GET_SETUP_DESCRIPTION =
  'The Setup Profiles of one bike - the numbers it is ridden at, kept in named sheets such as ' +
  'Trail, Race or Park. Several profiles are current at once and none is "the" setup, so name the ' +
  'profile a figure was read from. One row per profile: both tyre pressures in psi and bar - answer ' +
  'tyres in the tire_pressure_unit that comes with the row - and for the fork and the shock the ' +
  'pressure in psi, the tokens, the sag and the rebound and compression clicks, counted from fully ' +
  'closed. fork or shock at null means the bike has no such suspension; a number at null was never ' +
  'written down. An empty answer means no profile is recorded for the bike, which is not a setup of ' +
  'zeros. Read-only: nothing here writes, changes or deletes a profile. There is no date on a ' +
  'profile, so never say when it was set.';

// One bar is this many psi. Pressures are stored in psi; bar is read off them.
const PSI_PER_BAR = 14.5038;

// The row and the two things it is read against: which sections the bike has, and the unit its
// owner reads tyres in.
const profileSelect = {
  name: true,
  note: true,
  front_tire_psi: true,
  rear_tire_psi: true,
  fork_pressure_psi: true,
  fork_tokens: true,
  fork_sag_percent: true,
  fork_rebound_ls: true,
  fork_rebound_hs: true,
  fork_compression_ls: true,
  fork_compression_hs: true,
  shock_pressure_psi: true,
  shock_tokens: true,
  shock_sag_percent: true,
  shock_rebound_ls: true,
  shock_rebound_hs: true,
  shock_compression_ls: true,
  shock_compression_hs: true,
  bikes: {
    select: {
      has_front_suspension: true,
      has_rear_suspension: true,
      users: { select: { tire_pressure_unit: true } },
    },
  },
} satisfies Prisma.setup_profilesSelect;

type ProfileRecord = Prisma.setup_profilesGetPayload<{ select: typeof profileSelect }>;

// The setup axis of the catalogue: what the rider dialled in, as opposed to what the part is.
// Ownership is written here, and `userId` lives in the closure, in no schema the model can fill.
export function setupTools(prisma: PrismaService, userId: number): SetupToolSet {
  return {
    get_setup: {
      description: GET_SETUP_DESCRIPTION,
      inputSchema: getSetupInput,
      execute: async (input: GetSetupInput): Promise<ToolPage<SetupProfileRow>> => {
        // A bike this user does not own, or one that is archived, matches nothing: the answer is
        // an empty setup rather than somebody else's.
        const profiles = await prisma.setup_profiles.findMany({
          where: { bike_id: input.bike_id, bikes: ownedBikesWhere(userId) },
          orderBy: { id: 'asc' },
          select: profileSelect,
        });

        const rows = profiles.map(toSetupProfileRow);

        // The setup is never cut: a bike carries a handful of profiles.
        return { rows, total_count: rows.length };
      },
    },
  };
}

function toSetupProfileRow(profile: ProfileRecord): SetupProfileRow {
  return {
    profile_name: profile.name,
    note: profile.note ?? '',
    tire_pressure_unit: profile.bikes.users.tire_pressure_unit,
    tires: {
      front: toTirePressure(profile.front_tire_psi),
      rear: toTirePressure(profile.rear_tire_psi),
    },
    fork: profile.bikes.has_front_suspension ? toForkSetup(profile) : null,
    shock: profile.bikes.has_rear_suspension ? toShockSetup(profile) : null,
  };
}

function toForkSetup(profile: ProfileRecord): SuspensionSetup {
  return {
    pressure_psi: psi(profile.fork_pressure_psi),
    tokens: number(profile.fork_tokens),
    sag_percent: number(profile.fork_sag_percent),
    rebound_ls_clicks: number(profile.fork_rebound_ls),
    rebound_hs_clicks: number(profile.fork_rebound_hs),
    compression_ls_clicks: number(profile.fork_compression_ls),
    compression_hs_clicks: number(profile.fork_compression_hs),
  };
}

function toShockSetup(profile: ProfileRecord): SuspensionSetup {
  return {
    pressure_psi: psi(profile.shock_pressure_psi),
    tokens: number(profile.shock_tokens),
    sag_percent: number(profile.shock_sag_percent),
    rebound_ls_clicks: number(profile.shock_rebound_ls),
    rebound_hs_clicks: number(profile.shock_rebound_hs),
    compression_ls_clicks: number(profile.shock_compression_ls),
    compression_hs_clicks: number(profile.shock_compression_hs),
  };
}

function toTirePressure(stored: Prisma.Decimal | null): TirePressure {
  const value = psi(stored);

  return { psi: value, bar: value === null ? null : toBar(value) };
}

// Bar to one decimal, which is how the screen reads it and how a rider says it.
function toBar(value: number): number {
  return Math.round((value / PSI_PER_BAR) * 10) / 10;
}

// A stored pressure as a plain number. The column is a decimal, which the client hands over as an
// object; null stays null on the rule below.
function psi(value: Prisma.Decimal | null): number | null {
  return value === null ? null : Number(value);
}

// A setting nobody wrote down goes out as null, on the rule every other tool follows: a zero
// is a setting, and a fork at 0 psi is a sentence no owner should ever read.
function number(value: number | null | undefined): number | null {
  return value ?? null;
}
