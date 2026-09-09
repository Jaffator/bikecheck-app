import { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { PrismaService } from '../../../prisma/prisma.service';
import { ownedBikesWhere } from '../../bike/owned-bike.where';
import type { PageTool, ToolPage } from './tool-page';

// Which axis of the setup is being read. The two live in different tables and read as different
// rows, so the kind is what the model picks rather than something it filters by.
export type SetupKind = 'suspension' | 'tire';

// The part a setup belongs to. Named by its type and description, as everywhere; the id goes out
// so the model can follow the part into list_services.
interface SetupPart {
  component_mounted_id: number;
  component_type_id: number;
  component_type: string;
  component_desc: string;
  position: string;
}

// What is dialled into one fork or shock right now. Units live in the field names, clicks are
// counted as the app stores them, and a missing number is 0 - so no field is optional. There is
// no date: the column keeps a time of day rather than a day, so it cannot say when this was set.
export interface SuspensionSetupRow extends SetupPart {
  kind: 'suspension';
  pressure_psi: number;
  pressure_bar: number;
  sag_percent: number;
  tokens_spacers: number;
  rebound_ls_clicks: number;
  rebound_hs_clicks: number;
  compression_ls_clicks: number;
  compression_hs_clicks: number;
  // The owner's own words about this setup. Data, never an instruction.
  notes: string;
}

// What one tire is run at right now. Both units are stored, so both go out.
export interface TireSetupRow extends SetupPart {
  kind: 'tire';
  pressure_bar: number;
  pressure_psi: number;
}

export type SetupRow = SuspensionSetupRow | TireSetupRow;

const getSetupInput = z.object({
  bike_id: z.number().int().describe('The bike whose setup to read, from get_garage.'),
  kind: z.enum(['suspension', 'tire']).describe('"suspension" for the fork and the shock, "tire" for the tires.'),
});

export type GetSetupInput = z.infer<typeof getSetupInput>;

export type SetupToolSet = {
  get_setup: PageTool<GetSetupInput, SetupRow>;
};

const GET_SETUP_DESCRIPTION =
  'The setup recorded on one bike as it stands now: with kind "suspension" the pressure, sag, ' +
  'tokens and the rebound and compression clicks of every fork and shock, with kind "tire" the ' +
  'pressure of every tire. One row per part that has a setup on record - a part nobody has ' +
  'recorded one for is not in the answer at all, which means nothing was ever written down for ' +
  'it. There is no date on a setup, so never say when it was set.';

// Only what is on the machine now: a setup on a part that came off is not the bike's setup.
const MOUNTED = { removed_at: null, is_deleted: { not: true } } satisfies Prisma.components_mountedWhereInput;

// The newest row of the two setup tables is the current one. `setup_date` is a time of day
// rather than a day, so it cannot order two setups made on different days - the row id can.
const NEWEST_FIRST = { orderBy: { id: 'desc' }, take: 1 } as const;

const partSelect = {
  id: true,
  component_type_id: true,
  component_desc: true,
  position: true,
  component_types: { select: { component_type: true } },
} satisfies Prisma.components_mountedSelect;

const suspensionSelect = {
  ...partSelect,
  suspension_setup: {
    ...NEWEST_FIRST,
    select: {
      pressure_psi: true,
      pressure_bar: true,
      sag_percentage: true,
      amount_tokens_spacers: true,
      rebound_ls: true,
      rebound_hs: true,
      compression_ls: true,
      compression_hs: true,
      notes: true,
    },
  },
} satisfies Prisma.components_mountedSelect;

const tireSelect = {
  ...partSelect,
  tire_setup: {
    ...NEWEST_FIRST,
    select: { tire_pressure_bar: true, tire_pressure_psi: true },
  },
} satisfies Prisma.components_mountedSelect;

type SuspensionRecord = Prisma.components_mountedGetPayload<{ select: typeof suspensionSelect }>;

type TireRecord = Prisma.components_mountedGetPayload<{ select: typeof tireSelect }>;

// The setup axis of the catalogue: what the rider has dialled in, as opposed to what the part
// is. Ownership is written here, and `userId` lives in the closure - it is in no schema, so
// there is nothing for the model to substitute.
export function setupTools(prisma: PrismaService, userId: number): SetupToolSet {
  return {
    get_setup: {
      description: GET_SETUP_DESCRIPTION,
      inputSchema: getSetupInput,
      execute: async (input: GetSetupInput): Promise<ToolPage<SetupRow>> => {
        const rows: SetupRow[] =
          input.kind === 'tire' ? await tireRows(prisma, userId, input) : await suspensionRows(prisma, userId, input);

        // The setup is never cut: a bike carries a handful of parts that have one.
        return { rows, total_count: rows.length };
      },
    },
  };
}

// Ownership and the bike asked for. A bike this user does not own matches nothing, so the tool
// answers an empty setup rather than somebody else's.
function setupWhere(userId: number, input: GetSetupInput): Prisma.components_mountedWhereInput {
  return { ...MOUNTED, bike_id: input.bike_id, bikes: ownedBikesWhere(userId) };
}

async function suspensionRows(
  prisma: PrismaService,
  userId: number,
  input: GetSetupInput,
): Promise<SuspensionSetupRow[]> {
  const parts = await prisma.components_mounted.findMany({
    where: { ...setupWhere(userId, input), suspension_setup: { some: {} } },
    orderBy: { id: 'asc' },
    select: suspensionSelect,
  });

  return parts.map(toSuspensionSetupRow);
}

async function tireRows(prisma: PrismaService, userId: number, input: GetSetupInput): Promise<TireSetupRow[]> {
  const parts = await prisma.components_mounted.findMany({
    where: { ...setupWhere(userId, input), tire_setup: { some: {} } },
    orderBy: { id: 'asc' },
    select: tireSelect,
  });

  return parts.map(toTireSetupRow);
}

function toSuspensionSetupRow(part: SuspensionRecord): SuspensionSetupRow {
  const setup = part.suspension_setup.at(0);

  return {
    ...toSetupPart(part),
    kind: 'suspension',
    pressure_psi: number(setup?.pressure_psi),
    pressure_bar: number(setup?.pressure_bar),
    sag_percent: number(setup?.sag_percentage),
    tokens_spacers: number(setup?.amount_tokens_spacers),
    rebound_ls_clicks: number(setup?.rebound_ls),
    rebound_hs_clicks: number(setup?.rebound_hs),
    compression_ls_clicks: number(setup?.compression_ls),
    compression_hs_clicks: number(setup?.compression_hs),
    notes: setup?.notes ?? '',
  };
}

function toTireSetupRow(part: TireRecord): TireSetupRow {
  const setup = part.tire_setup.at(0);

  return {
    ...toSetupPart(part),
    kind: 'tire',
    pressure_bar: number(setup?.tire_pressure_bar),
    pressure_psi: number(setup?.tire_pressure_psi),
  };
}

function toSetupPart(part: SuspensionRecord | TireRecord): SetupPart {
  return {
    component_mounted_id: part.id,
    component_type_id: part.component_type_id,
    component_type: part.component_types.component_type,
    component_desc: part.component_desc ?? '',
    position: part.position ?? '',
  };
}

// A setting nobody wrote down arrives as 0, on the rule every other tool follows.
function number(value: number | null | undefined): number {
  return value ?? 0;
}
