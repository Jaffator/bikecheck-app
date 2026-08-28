# A backdated service rewinds wear baselines from ride data

A service records the date the work actually happened, which is often earlier than the date it was
entered — users commonly backfill history when they add a bike. Wear accumulators on a mounted
component, however, only ever hold today's value, so freezing them as-is would attribute every ride
between the service date and the entry date to the state *at* the service.

We therefore sum the rides that happened after the service date and subtract them, so the frozen
baseline reflects the bike as it stood on the service date. The same sum is used in the opposite
direction for a replacement: the newly mounted component starts with the wear it genuinely
accumulated since being fitted, not at zero.

## Consequences

- One `rides` aggregate per service write. When the service date is today the sum is zero and
  nothing changes, so the common path is unaffected.
- Baselines are clamped at zero, which covers a component mounted after the service date.
- Ride data is the only source for this. A bike not synced with Strava has no rides to subtract,
  so its baselines equal today's accumulators — which is correct, because its accumulators do not
  grow either.
- Editing a service's date must re-run the same calculation for every action on it. This is why
  removing a replacement from an existing service is refused: the component it created may already
  carry rides, later services, or its own replacement.
