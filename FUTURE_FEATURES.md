# Future Features

Planned features that are intentionally deferred until the app is otherwise complete.

---

## Component Reminders

Standalone reminders attached to a mounted component (`components_mounted`).

**Kept separate on purpose** — a new `component_reminder` table, **not** mixed into
`bike_service_interval` / `default_service_intervals`. Those are the real service plan
the engine reads; reminders are a different concept.

### Reminder vs. event action

- **Event action** (`events_action`) closes a loop: do it → log `events_action_done`
  → produces history / cost / part-replacement record.
- **Reminder** just fires and is dismissed — no history record, no cost, no part.

### Trigger types

A `ReminderTrigger` enum, with only the fields each type needs:

| Type        | Fires when                              | Fields                          |
| ----------- | --------------------------------------- | ------------------------------- |
| `DISTANCE`  | X km ridden since reset                 | `interval_km` + `base_km`       |
| `RIDE_TIME` | X minutes ridden since reset            | `interval_min` + `base_min`     |
| `DATE`      | a specific date/time is reached         | `due_at` (absolute, one-shot)   |

- `DISTANCE` / `RIDE_TIME` are **relative** to component usage
  (`total_km` / `total_time_min`) and need a `base_*` baseline snapshot.
- `DATE` is **absolute** — one-shot; deactivate (`is_active = false`) after firing.
- Optional future 4th type `CALENDAR` (`interval_days`) for recurring calendar
  reminders — do **not** overload `DATE` for that.

### Behavior

- On dismiss/reset: set `base_km` / `base_min` to current component totals and
  set `last_notified_at`.
- Exactly-one-trigger validation lives in the **service layer** (Prisma can't
  enforce it).

### Proposed schema

```prisma
enum ReminderTrigger {
  DISTANCE
  RIDE_TIME
  DATE
}

model component_reminder {
  id                   Int                @id @default(autoincrement())
  component_mounted_id Int
  title                String             @db.VarChar
  note                 String?

  trigger_type         ReminderTrigger

  // DISTANCE
  interval_km          Int?
  base_km              Int?
  // RIDE_TIME (minutes, consistent with total_time_min)
  interval_min         Int?
  base_min             Int?
  // DATE (absolute deadline)
  due_at               DateTime?          @db.Timestamptz(6)

  is_active            Boolean            @default(true)
  last_notified_at     DateTime?          @db.Timestamptz(6)
  created_at           DateTime?          @default(now()) @db.Timestamptz(6)
  updated_at           DateTime?          @updatedAt @db.Timestamptz(6)

  components_mounted   components_mounted @relation(fields: [component_mounted_id], references: [id], onDelete: Cascade)

  @@index([component_mounted_id])
  @@map("component_reminder")
}
```

### Related UX decisions

- **"Add event"** lives in the bike detail (logs completed maintenance).
- **Reminders / tracking** live in the component detail sheet.
- New custom `events_action` types are created **inline** in the flow (not on a
  separate management screen). `events_action.user_id` already supports per-user
  custom actions.

---

## Public Shareable BikeCheck Report

A public, shareable document showing the whole BikeCheck for a bike:
the full component list plus the ability to generate a link to the
**service history + BikeCheck**.

### Foundation already exists

The `reports` model (schema.prisma) is already the backbone for this:

- `public_token` — unguessable token for the public URL
- `snapshot` (Json) — frozen copy of bike + components + service history
  (survives bike deletion; `bike_id` is informative, not a relation)
- `view_count` / `last_viewed_at` — basic view analytics
- `revoked` — let the user kill a shared link
- `expires_at` — optional expiry

So the DB layer is largely in place; what remains is the generation flow and
the public view.

### What to build

1. **Generate a report** — endpoint that materializes the current bike into a
   `snapshot` (bike + component list + service history) and returns the public
   link. Frozen so later changes don't alter an already-shared proof.
2. **Public view** — a no-auth page served by `public_token` that renders the
   snapshot: bike overview, component list, and full service history.
3. **Manage / revoke** — user can see their shared links, revoke (`revoked`) or
   set `expires_at`.

### Open questions

- Content scope: whole BikeCheck vs. a service-history-only variant — could be
  one report type with a toggle, or two.
- Snapshot vs. live: snapshot (current model) is the right call for a "proof"
  that must not change after sharing.
