// Where a Tracked Action leads: the service wizard, opened on the actions step with this
// very job ticked on this very part. The URL is the contract ADR 0017 set for a Replacement
// carried in from a part; a Tracked Action already knows every piece of it (ADR 0030).
import type { TrackedAction } from "./tracking.types";

export function trackedActionServiceLink(action: TrackedAction): string {
  const query = new URLSearchParams({
    bike: String(action.bike_id),
    category: String(action.component_group_id),
    action: String(action.event_action_id),
    component: String(action.component_mounted_id),
  });
  return `/service/new?${query.toString()}`;
}
