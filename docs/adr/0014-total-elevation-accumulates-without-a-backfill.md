# Total Elevation accumulates from now on, and is never backfilled

A Bike carries `total_elevation_m`, incremented as each ride arrives from Strava. The rides
already recorded when the column was added do not count towards it.

The rides are all still there, so a backfill is possible — one `SUM(elevation_up_m)` per bike. It
is not run. A backfill would have to be re-run for anyone whose rides sync late, would have to
decide what a ride recorded against a since-deleted bike means, and would make the first number an
owner sees depend on when their migration happened rather than on what they rode. Starting every
bike at zero is wrong in a way that is at least uniform, and that stops being wrong on its own as
the riding continues.

The cost lands on existing users: a bike with three seasons on it reads as having climbed nothing
until its next ride, and the reading stays short by whatever it climbed before today, forever. That
is a real lie on a real screen, and the reason this is written down rather than left in the diff.

## Consequences

- The increment moves by the difference, not the total, so re-syncing a ride does not count its
  metres twice.
- A ride that arrives for a bike, is deleted, and never re-syncs leaves its metres behind on the
  accumulator. The reading is what has been ridden, not what the rides table currently says.
- `bikes.total_km` is **not** this. Nothing increments it from rides at all — it is a figure the
  owner types in once, when the bike is added. The Total distance reading is therefore only as
  current as the owner made it, which is a separate problem and not one this decision fixes.
- If a backfill is ever wanted, it is a one-off script and this decision is what it reverses.
