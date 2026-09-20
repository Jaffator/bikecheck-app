// The Follows sub-page at /follows: two tabs drawn and swiped the way /rides draws its own.
// The tab lives in the URL - ?tab=followers is the address the dashboard figures and the
// owner-side notifications point at; the first tab carries no param.
import { useCallback, type ReactElement, type ReactNode } from "react";
import { Box, Tabs } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { FollowersPanels } from "@/features/follow/ui/FollowersPanels";
import { FollowingPanels } from "@/features/follow/ui/FollowingPanels";
import { SETTLE_MS, useSwipePanels } from "@/hooks/useSwipePanels";

type FollowsTab = "following" | "followers";

// Panel order, which is also the order a swipe moves through them.
const TAB_ORDER: FollowsTab[] = ["following", "followers"];

function readTab(value: string | null): FollowsTab {
  return value === "followers" ? "followers" : "following";
}

// One panel of the swipe track, as /rides keeps its own: hidden rather than unmounted while
// it is not the one being read, so its scroll position survives a swipe away.
function SwipePanel({ current, moving, children }: { current: boolean; moving: boolean; children: ReactNode }): ReactElement {
  return (
    <Box className="min-w-0 shrink-0 basis-full" style={{ visibility: current || moving ? "visible" : "hidden" }}>
      {children}
    </Box>
  );
}

export function Follows(): ReactElement {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab = readTab(params.get("tab"));
  const activeIndex = TAB_ORDER.indexOf(tab);

  const selectTab = useCallback(
    (next: FollowsTab): void => {
      const nextParams = new URLSearchParams(params);
      if (next === "followers") nextParams.set("tab", "followers");
      else nextParams.delete("tab");
      setParams(nextParams, { replace: true });
    },
    [params, setParams],
  );

  // A finished swipe selects a tab, which is the same thing tapping one does.
  const selectIndex = useCallback((next: number): void => selectTab(TAB_ORDER[next]), [selectTab]);
  const swipe = useSwipePanels(activeIndex, TAB_ORDER.length, selectIndex);

  return (
    <Tabs
      value={tab}
      onChange={(value) => selectTab(readTab(value))}
      styles={{
        root: { "--tab-border-color": "var(--color-text-900)" },
        tab: { borderBottomWidth: 3, "--tab-hover-color": "transparent" },
      }}
      color="primary.6"
    >
      <Tabs.List grow>
        <Tabs.Tab value="following" c={tab === "following" ? "text.6" : "text.8"}>
          {t("follow.tabFollowing")}
        </Tabs.Tab>
        <Tabs.Tab value="followers" c={tab === "followers" ? "text.6" : "text.8"}>
          {t("follow.tabFollowers")}
        </Tabs.Tab>
      </Tabs.List>

      {/* pan-y leaves vertical scrolling to the browser and hands the sideways gesture here. */}
      <Box className="overflow-hidden" style={{ touchAction: "pan-y" }} {...swipe.handlers}>
        <Box
          className="flex items-start"
          style={{
            transform: `translate3d(calc(${-activeIndex * 100}% + ${swipe.offset}px), 0, 0)`,
            transition: swipe.dragging ? "none" : `transform ${SETTLE_MS}ms ease-out`,
          }}
        >
          <SwipePanel current={tab === "following"} moving={swipe.moving}>
            <FollowingPanels />
          </SwipePanel>
          <SwipePanel current={tab === "followers"} moving={swipe.moving}>
            <FollowersPanels />
          </SwipePanel>
        </Box>
      </Box>
    </Tabs>
  );
}
