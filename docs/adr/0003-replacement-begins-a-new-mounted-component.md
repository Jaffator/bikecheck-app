# Replacing a part begins a new mounted component

When a part is replaced, the obvious move is to zero the existing row's wear accumulators. We
deactivate it instead (`is_active: false`, `removed_at`) and create a fresh `components_mounted`
row for the new part.

A mounted component is one physical object. Zeroing the row would erase how long the old part
lasted — which is exactly the question the user asks next time ("how far do I get on a chain?") —
and would leave past services pointing at a component whose history no longer matches them.

## Consequences

- A bike accumulates inactive mounted components over time. Anything listing a bike's build must
  filter on `is_active`.
- Wear baselines frozen by earlier services stay valid, because they reference the row that was
  actually worn.
- A replacement cannot be undone by editing the service that recorded it: the new component may
  already carry rides, its own service, or its own replacement. Removing it is refused — see
  ADR 0001.
