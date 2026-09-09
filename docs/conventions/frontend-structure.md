# Frontend structure

Where a file in `_frontend/bikecheck/src/features/` belongs. One rule, two shapes of folder.

## A domain owns everything about itself

```
features/<domain>/
├── <domain>.api.ts        the requests
├── <domain>.queries.ts    the hooks that call them
├── <domain>.types.ts      what the API serves
├── <helpers>.ts           labels, formatting, anything derived
└── ui/                    every component the domain draws
```

Data lives in the domain's root; components live in `ui/`. That is the only nesting — no
`data/`, no `hooks/`, no `api/`. A domain with three files does not need four folders.

**A component goes to the domain it is _about_, not to the screen that happens to show it.**
`BikeComponentRow` draws a part, so it lives in `components/ui/` even though only the bike's
page renders it. Reuse is not the test: one page today is two pages next month, and moving a
file because a second caller appeared is work nobody should have to do.

## A page folder is the route layer

```
features/<domain>_page/
├── <Domain>.tsx           what AppRouter points at
└── Empty<Domain>.tsx      the screen's own empty state
```

Nothing else. If a file in a `_page/` folder is not a route or that route's own empty state,
it belongs in some domain's `ui/`.

## Why not split by file kind

`.ts` in one folder and `.tsx` in another was considered and rejected: it separates the files
that change together — add a field to a type and you touch the type, the query and the row
that reads it — and it groups files that have nothing to do with each other, which is what
`bikes_page/` had become before this rule existed.

## State of the migration

Done: `bikes/ui`, `components/ui`.

Not yet moved — these domains still keep their components in their root, and `bikes_page/`
still holds four files belonging to two of them (`HealthBadge`, `TrackedActionsSection`,
`BikeStravaCard`, `StravaLinkedBadge`):

`service` · `report` · `strava` · `rides` · `service_tracking`

Each moves whole, not file by file: half a domain in `ui/` and half in its root is worse than
either shape.
