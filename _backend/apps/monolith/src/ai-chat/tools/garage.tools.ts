import { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { PrismaService } from '../../../prisma/prisma.service';
import { ownedBikesWhere } from '../../bike/owned-bike.where';
import type { PageTool, ToolPage } from './tool-page';

// One part on one bike, as the model reads it. Ids go out so the other tools can be called
// with them; units live in the field names; a missing number is 0, so no field is optional.
export interface GaragePartRow {
  component_mounted_id: number;
  component_type_id: number;
  component_type: string;
  position: string;
  component_desc: string;
  total_km: number;
  total_time_min: number;
}

// One bike with what is on it now. Named by brand and model - `bikename` is what its owner
// calls it, not what it is, so it never reaches the model.
export interface GarageBikeRow {
  bike_id: number;
  bike_brand: string;
  bike_model: string;
  total_km: number;
  total_time_min: number;
  elevation_m: number;
  parts: GaragePartRow[];
}

// The garage takes no arguments: it is the whole of what the user owns.
const getGarageInput = z.object({});

export type GetGarageInput = z.infer<typeof getGarageInput>;

export type GarageToolSet = {
  get_garage: PageTool<GetGarageInput, GarageBikeRow>;
};

const GET_GARAGE_DESCRIPTION =
  'The bikes the user owns and the parts mounted on them right now, with the ids every other ' +
  'tool takes. Call this before anything else. Takes no arguments.';

// Only what is on the machine now. A part that came off, or one that should never have
// existed, is not part of the build any more.
const MOUNTED = { removed_at: null, is_deleted: { not: true } } satisfies Prisma.components_mountedWhereInput;

// The bike and its build, with nothing derived: the computed columns wear tracking reads are
// inputs to a reading, not answers, so they stay in.
const garageSelect = {
  id: true,
  bike_brand: true,
  bike_model: true,
  total_km: true,
  total_time_min: true,
  total_elevation_m: true,
  components_mounted: {
    where: MOUNTED,
    orderBy: { id: 'asc' },
    select: {
      id: true,
      component_type_id: true,
      component_desc: true,
      position: true,
      total_km: true,
      total_time_min: true,
      component_types: { select: { component_type: true } },
    },
  },
} satisfies Prisma.bikesSelect;

type GarageBike = Prisma.bikesGetPayload<{ select: typeof garageSelect }>;

type GaragePart = GarageBike['components_mounted'][number];

// The entry point of the catalogue: the model calls this first and takes the ids it needs for
// every other tool out of it. Ownership is written here, in the tool, and `userId` lives in
// the closure - it is in no schema, so there is nothing for the model to substitute.
export function garageTools(prisma: PrismaService, userId: number): GarageToolSet {
  return {
    get_garage: {
      description: GET_GARAGE_DESCRIPTION,
      inputSchema: getGarageInput,
      execute: async (): Promise<ToolPage<GarageBikeRow>> => {
        const bikes = await prisma.bikes.findMany({
          where: ownedBikesWhere(userId),
          orderBy: { id: 'asc' },
          select: garageSelect,
        });

        const rows = bikes.map(toGarageBikeRow);

        // The garage is never cut: it is the list the rest of the catalogue is reached through.
        return { rows, total_count: rows.length };
      },
    },
  };
}

function toGarageBikeRow(bike: GarageBike): GarageBikeRow {
  return {
    bike_id: bike.id,
    bike_brand: bike.bike_brand,
    bike_model: bike.bike_model ?? '',
    total_km: bike.total_km ?? 0,
    total_time_min: bike.total_time_min ?? 0,
    elevation_m: bike.total_elevation_m ?? 0,
    parts: bike.components_mounted.map(toGaragePartRow),
  };
}

function toGaragePartRow(part: GaragePart): GaragePartRow {
  return {
    component_mounted_id: part.id,
    component_type_id: part.component_type_id,
    component_type: part.component_types.component_type,
    position: part.position ?? '',
    component_desc: part.component_desc ?? '',
    total_km: part.total_km ?? 0,
    total_time_min: part.total_time_min ?? 0,
  };
}
