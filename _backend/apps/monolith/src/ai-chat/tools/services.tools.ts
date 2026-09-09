import { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { PrismaService } from '../../../prisma/prisma.service';
import { ownedBikesWhere } from '../../bike/owned-bike.where';
import { decodeCursor, encodeCursor, type Cursor } from './cursor';
import { dateRange, isoDay } from './tool-dates';
import type { PageTool, ToolPage } from './tool-page';

// One part an action was recorded against. The ids are the ones list_parts and get_garage use,
// so the model can follow a service back to the part it touched.
export interface ServicePartRow {
  component_mounted_id: number;
  component_type_id: number;
  component_type: string;
  component_desc: string;
  position: string;
}

// One item of work within a service. `tags` is catalogue data - what this action covers in
// general, never a record of what happened on this occasion (ADR 0004). Only `note` says that.
export interface ServiceActionRow {
  action_id: number;
  action_name: string;
  tags: string[];
  note: string;
  cost: number;
  part_replaced: boolean;
  parts: ServicePartRow[];
}

// One maintenance occasion on one bike, with everything that was done on it. Named by brand and
// model, as everywhere - `bikename` is what its owner calls it, not what it is.
export interface ServiceRow {
  service_id: number;
  bike_id: number;
  bike_brand: string;
  bike_model: string;
  // ISO day, or null on a service whose date nobody recorded.
  service_date: string | null;
  cost: number;
  note: string;
  actions: ServiceActionRow[];
}

const listServicesInput = z.object({
  bike_id: z.number().int().optional().describe('Only services on this bike, from get_garage.'),
  component_type_id: z.number().int().optional().describe('Only services that touched a part of this kind.'),
  mounted_component_id: z.number().int().optional().describe('Only services that touched this one part.'),
  action_id: z.number().int().optional().describe('Only services carrying this action, from a previous answer.'),
  from: z.string().optional().describe('Done on or after this ISO day, e.g. "2026-01-01".'),
  to: z.string().optional().describe('Done on or before this ISO day.'),
  replaced_only: z.boolean().optional().describe('true for occasions on which a part was replaced.'),
  cursor: z.string().optional().describe('next_cursor of the previous page. Omit for the first page.'),
});

export type ListServicesInput = z.infer<typeof listServicesInput>;

export type ServicesToolSet = {
  list_services: PageTool<ListServicesInput, ServiceRow>;
};

const LIST_SERVICES_DESCRIPTION =
  'The maintenance recorded on the bikes the user owns, newest first: one row per occasion, with ' +
  'the actions done on it, the parts each action touched and what each cost. The filters pick the ' +
  'occasion and a matching occasion comes back whole, so read the actions to see which of them ' +
  'touched the part you asked about. Filters other than the dates must all hold on one and the ' +
  'same action. `tags` says what an action covers in general; only `note` says what was done ' +
  'this time.';

// One page of services. A row carries its actions and their parts, so it is a fat row - half a
// hundred of them would be a page the model reads badly.
const PAGE_SIZE = 25;

// The sort key of a service with no date. Never empty, because an empty key does not survive
// the cursor.
const NO_DATE = '-';

// Newest work first, undated services last, and the row id to break a tie - which is what keeps
// a page from skipping two services done on the same day.
const servicesOrder = [
  { service_date: { sort: 'desc', nulls: 'last' } },
  { id: 'desc' },
] satisfies Prisma.events_bikesOrderByWithRelationInput[];

// Everything a row is made of and nothing else: the occasion, its actions in the order they were
// recorded, and the parts each one touched. Attachments and the public report token are not part
// of an answer, so they are not read.
const servicesSelect = {
  id: true,
  bike_id: true,
  service_date: true,
  total_cost: true,
  note: true,
  bikes: { select: { bike_brand: true, bike_model: true } },
  event_actions_done: {
    orderBy: { id: 'asc' },
    select: {
      event_action_id: true,
      note: true,
      partial_cost: true,
      part_replaced: true,
      events_action: {
        select: {
          action_name: true,
          // `user_id` comes along so the mapper can drop a tag another user added to this
          // shared catalogue action; a seeded tag carries no user at all (ADR 0008).
          event_action_tags: { orderBy: { id: 'asc' }, select: { event_action_tag: true, user_id: true } },
        },
      },
      action_done_component_map: {
        orderBy: { component_mounted_id: 'asc' },
        select: {
          components_mounted: {
            select: {
              id: true,
              component_type_id: true,
              component_desc: true,
              position: true,
              component_types: { select: { component_type: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.events_bikesSelect;

type ServiceRecord = Prisma.events_bikesGetPayload<{ select: typeof servicesSelect }>;

type ActionRecord = ServiceRecord['event_actions_done'][number];

type LinkRecord = ActionRecord['action_done_component_map'][number];

// The maintenance axis of the catalogue: what was done, when and for how much. Ownership is
// written here, and `userId` lives in the closure - it is in no schema, so there is nothing for
// the model to substitute.
export function servicesTools(prisma: PrismaService, userId: number): ServicesToolSet {
  return {
    list_services: {
      description: LIST_SERVICES_DESCRIPTION,
      inputSchema: listServicesInput,
      execute: async (input: ListServicesInput): Promise<ToolPage<ServiceRow>> => {
        const filter = servicesWhere(userId, input);
        const after = pageStart(decodeCursor(input.cursor));
        const where = after === undefined ? filter : { ...filter, AND: [after] };

        // One more row than a page, which is how the end of the list is recognised.
        const [found, total_count] = await Promise.all([
          prisma.events_bikes.findMany({
            where,
            orderBy: servicesOrder,
            take: PAGE_SIZE + 1,
            select: servicesSelect,
          }),
          prisma.events_bikes.count({ where: filter }),
        ]);

        const cut = found.length > PAGE_SIZE;
        const services = cut ? found.slice(0, PAGE_SIZE) : found;
        const rows = services.map((service) => toServiceRow(service, userId));
        const last = services.at(-1);

        if (!cut || last === undefined) return { rows, total_count };

        return { rows, total_count, truncated: true, next_cursor: encodeCursor(sortKeyOf(last), last.id) };
      },
    },
  };
}

// Ownership plus whatever the model asked to narrow by. `events_bikes` has no owner column of
// its own, so the bike carries it - a service of a bike this user does not own is not reachable
// through any combination of the filters. A deleted Service is no longer part of the record.
function servicesWhere(userId: number, input: ListServicesInput): Prisma.events_bikesWhereInput {
  const done = actionWhere(input);
  const on = dateRange(input.from, input.to);

  return {
    bikes: ownedBikesWhere(userId),
    is_deleted: { not: true },
    ...(input.bike_id === undefined ? {} : { bike_id: input.bike_id }),
    ...(on === undefined ? {} : { service_date: on }),
    ...(done === undefined ? {} : { event_actions_done: { some: done } }),
  };
}

// The action every filter but the dates has to hold on at the same time: asking for a chain and
// a replacement means one action that replaced a chain, not a service that did both separately.
// Nothing asked for is no clause at all, because a service is allowed to carry no actions.
function actionWhere(input: ListServicesInput): Prisma.event_actions_doneWhereInput | undefined {
  const touched = linkWhere(input);
  const clauses: Prisma.event_actions_doneWhereInput = {
    ...(input.action_id === undefined ? {} : { event_action_id: input.action_id }),
    ...(input.replaced_only === true ? { part_replaced: true } : {}),
    ...(touched === undefined ? {} : { action_done_component_map: { some: touched } }),
  };

  return Object.keys(clauses).length === 0 ? undefined : clauses;
}

// Which part the action has to have touched: the part itself, or any part of that kind.
function linkWhere(input: ListServicesInput): Prisma.action_done_component_mapWhereInput | undefined {
  const clauses: Prisma.action_done_component_mapWhereInput = {
    ...(input.mounted_component_id === undefined ? {} : { component_mounted_id: input.mounted_component_id }),
    ...(input.component_type_id === undefined
      ? {}
      : { components_mounted: { component_type_id: input.component_type_id } }),
  };

  return Object.keys(clauses).length === 0 ? undefined : clauses;
}

// Where the next page carries on, for `service_date DESC NULLS LAST, id DESC`. The sentinel says
// the last row read had no date, so only undated services are left.
function pageStart(cursor: Cursor | null): Prisma.events_bikesWhereInput | undefined {
  if (cursor === null) return undefined;
  if (cursor.sortKey === NO_DATE) return { service_date: null, id: { lt: cursor.id } };

  const at = new Date(cursor.sortKey);
  if (Number.isNaN(at.getTime())) return undefined;

  return {
    OR: [{ service_date: { lt: at } }, { service_date: at, id: { lt: cursor.id } }, { service_date: null }],
  };
}

function sortKeyOf(service: ServiceRecord): string {
  return service.service_date === null ? NO_DATE : service.service_date.toISOString();
}

function toServiceRow(service: ServiceRecord, userId: number): ServiceRow {
  return {
    service_id: service.id,
    bike_id: service.bike_id ?? 0,
    bike_brand: service.bikes?.bike_brand ?? '',
    bike_model: service.bikes?.bike_model ?? '',
    service_date: isoDay(service.service_date),
    cost: service.total_cost === null ? 0 : Number(service.total_cost),
    note: service.note ?? '',
    actions: service.event_actions_done.map((action) => toServiceActionRow(action, userId)),
  };
}

function toServiceActionRow(action: ActionRecord, userId: number): ServiceActionRow {
  return {
    action_id: action.event_action_id,
    action_name: action.events_action.action_name,
    tags: action.events_action.event_action_tags
      .filter((tag) => tag.user_id === null || tag.user_id === userId)
      .map((tag) => tag.event_action_tag),
    note: action.note ?? '',
    cost: action.partial_cost === null ? 0 : Number(action.partial_cost),
    part_replaced: action.part_replaced === true,
    parts: action.action_done_component_map.map(toServicePartRow),
  };
}

function toServicePartRow(link: LinkRecord): ServicePartRow {
  const part = link.components_mounted;

  return {
    component_mounted_id: part.id,
    component_type_id: part.component_type_id,
    component_type: part.component_types.component_type,
    component_desc: part.component_desc ?? '',
    position: part.position ?? '',
  };
}
