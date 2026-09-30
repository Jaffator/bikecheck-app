// Where recording a Tracked Action leads: the service wizard, opened on the actions step
// with this very job ticked on this very part. The URL is the contract ADR 0017 set for a
// Replacement carried in from a part; a Tracked Action already knows every piece of it
// (ADR 0030). Built by the drawer's own button since the row opens the drawer instead
// (ADR 0032).
import type { TrackedAction } from "./tracking.types";

export function trackedActionServiceLink(action: TrackedAction): string {
  return serviceLink({
    bikeId: action.bike_id,
    groupId: action.component_group_id,
    actionId: action.event_action_id,
    componentMountedId: action.component_mounted_id,
  });
}

export interface ServiceLinkIds {
  bikeId: number;
  groupId: number;
  actionId: number;
  componentMountedId: number;
}

// The same link from bare ids, for a caller that holds no Tracked Action (a service reminder).
export function serviceLink(ids: ServiceLinkIds): string {
  const query = new URLSearchParams({
    bike: String(ids.bikeId),
    category: String(ids.groupId),
    action: String(ids.actionId),
    component: String(ids.componentMountedId),
  });
  return `/service/new?${query.toString()}`;
}
