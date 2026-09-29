// UI component using feature hooks.
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { EMPTY_STATE_TOP, EmptyStateLayout } from "@/components/EmptyStateLayout";
import trailIllustration from "@/assets/images/rides.png";

// The tab bar and the swipe panel's own padding sit above the state, so it subtracts them and
// its title lands on the same line as on the tabs-free pages.
const TABS_CHROME = "3.75rem";

// What an empty state under the rides tabs offers the layout. Shared with the pending tab,
// which reuses the same state.
export const RIDES_TAB_TOP_SPACE = `calc(${EMPTY_STATE_TOP} - ${TABS_CHROME})`;

// Displays the empty rides state.
export function EmptyRides(): ReactElement {
  const { t } = useTranslation();

  return (
    <EmptyStateLayout
      illustration={trailIllustration}
      title={t("rides.emptyTitle")}
      body={t("rides.emptyBody")}
      topSpace={RIDES_TAB_TOP_SPACE}
    />
  );
}
