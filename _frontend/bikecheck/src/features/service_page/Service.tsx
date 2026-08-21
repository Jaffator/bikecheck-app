// Service page.
import type { ReactElement } from "react";
import { EmptyService } from "./EmptyService";

// Show the empty state until service data exists.
export function Service(): ReactElement {
  return <EmptyService />;
}
