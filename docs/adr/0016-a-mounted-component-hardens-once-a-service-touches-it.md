# A Mounted Component hardens once a Service touches it

A Mounted Component that no Service has recorded work against is Unserviced: its readings may still
be rewritten and the row deleted outright. The first Service to touch it settles it, and from then
on the part can only be dismounted — its accumulators are read-only and deleting is refused.

Both halves are needed and neither generalises. An owner entering a bike ridden for three years has
to be able to say the chain already carries 2 000 km, and an owner who added the same fork twice has
to be able to take the mistake back; a model where nothing is ever editable traps both of them. But
once a Service exists, its Wear Baselines are frozen against exactly those accumulators (ADR 0001)
and its line items point at exactly that row, so rewriting the numbers silently invalidates every
"how far since this was last done" the app has ever computed, and deleting the row orphans recorded
work. One rule covers both: the state of a part's service history decides whether it is still soft.

## Consequences

- The test is a single join, and it is one the list already runs: a part is Unserviced exactly when
  it has no `action_done_component_map` row — the same condition under which its last service date
  is null. Nothing extra is computed to enforce the rule.
- The components section shows different affordances for two rows that look identical. An Unserviced
  part offers Delete and editable mileage; a serviced one offers neither, and has to say why.
- Correcting a serviced part's mileage is impossible by design. The way out is to dismount it and
  mount a replacement — which is the truthful record anyway if the numbers were that wrong.
- Nothing hardens a part except a Service. Rides accumulate against it freely and it stays
  Unserviced, which is correct: rides freeze no baseline.
