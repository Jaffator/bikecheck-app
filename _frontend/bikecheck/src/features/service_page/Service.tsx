// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { EmptyService } from "./EmptyService";

// Nothing to service until components exist, so the empty state is the whole
// page for now. The populated list arrives with the component feature.
export function Service(): ReactElement {
  return <EmptyService />;
}
