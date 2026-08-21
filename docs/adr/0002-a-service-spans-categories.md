# A service is one occasion, not one per component category

Recording maintenance starts by picking a component category, which invites a design where each
category produces its own service record. We reject that: a service is one occasion — one workshop
visit, one receipt — and the category is only a filter for choosing actions. Picking a second
category adds another block of actions to the same service.

The alternative would split a single visit ("new chain, brakes bled, 2 400 CZK") into two records
with the cost divided arbitrarily and the receipt attached twice.

## Consequences

- Date, note, total cost and attachments belong to the service; only actions and their components
  belong to a block.
- Nothing in the schema represents a "category block" — it exists in the wizard only. Actions from
  every block land in the same `event_actions_done` list, and which category they came from is
  recoverable from the action's target component types.
