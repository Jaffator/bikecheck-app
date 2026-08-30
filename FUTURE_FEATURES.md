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

## Public Shareable BikeCheck Report — shipped

Delivered as **Reports** (PRD #38), not as the single "whole BikeCheck" document sketched
here. What shipped instead:

- **Three kinds**, not one with a toggle: a **Service Report** (one service, the doc a
  workshop or warranty claim asks for), a **Period Report** (a bike's services within a
  period, with History Totals and optionally its components), and a **BikeCheck** (the bike
  and everything mounted on it). The `reports.kind` column carries which.
- **Snapshot, not live** — the open question is settled: `reports.snapshot` freezes the
  document at Export, catalogue labels resolved into the owner's language and currency, so
  a Report reads as it did the day it was made and survives the bike being deleted
  (ADR 0011).
- **Made and published are two acts** — a Report is closed until its Share Link is opened,
  and revoking is final: the page and every attachment behind it close at the same instant
  (ADR 0011, ADR 0013).
- **Printed from its own public page** to A4, rather than built a second time (ADR 0012).
- **Managed from a list** — `GET /reports/mine`, reachable from the bike detail filtered to
  that bike, where a link is opened, copied or revoked.

The vocabulary lives in [CONTEXT.md](CONTEXT.md#sharing); the decisions in
[docs/adr/](docs/adr/) 0011–0013.
