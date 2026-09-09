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
├── Empty<Domain>.tsx      the screen's own empty state
└── <Step>.tsx             a screen that exists only for this route
```

A route, its empty state, and the pieces that have no life outside it — the steps of the
add-a-bike wizard, the drawers `settings_page` opens. Anything that is *about* a domain goes
to that domain's `ui/`, however few screens render it today.

## Why not split by file kind

`.ts` in one folder and `.tsx` in another was considered and rejected: it separates the files
that change together — add a field to a type and you touch the type, the query and the row
that reads it — and it groups files that have nothing to do with each other, which is what
`bikes_page/` had become before this rule existed.

## State of the migration

Every domain that draws anything now has one: `bikes` · `components` · `service` · `report` ·
`strava` · `rides` · `service_tracking`. No domain keeps a `.tsx` in its own root.

A domain moves whole, never file by file: half of one in `ui/` and half in its root is worse
than either shape.
