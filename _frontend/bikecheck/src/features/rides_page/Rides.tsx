// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { EmptyRides } from "./EmptyRides";

// Nothing to list until rides are recorded, so the empty state is the whole
// page for now. The ride list arrives with the Strava/tracking feature.
export function Rides(): ReactElement {
  return <EmptyRides />;
}
