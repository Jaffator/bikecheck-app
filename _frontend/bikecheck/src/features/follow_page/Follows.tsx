// The Follows sub-page at /follows, two tabs swiped the way /rides does. The tab lives in the
// URL: ?tab=followers is what the dashboard figures and the owner-side notifications point at.
import { useCallback, type ReactElement, type ReactNode } from "react";
import { Box, Tabs } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useFollowers, useFollowing } from "@/features/follow/follow.queries";
import { FollowersPanels } from "@/features/follow/ui/FollowersPanels";
import { FollowingPanels } from "@/features/follow/ui/FollowingPanels";
import { FollowsTabLabel } from "@/features/follow/ui/FollowsTabLabel";
import { SETTLE_MS, useSwipePanels } from "@/hooks/useSwipePanels";
import { useIsDesktop } from "@/layout/breakpoints";
import { FollowsDesktop } from "./FollowsDesktop";

type FollowsTab = "following" | "followers";

// Panel order, which is also the order a swipe moves through them.
const TAB_ORDER: FollowsTab[] = ["following", "followers"];

// The app header's height - see AppLayout. The page fills what is left below it, so a swipe
// lands on the blank space under a short tab as well as on its cards.
const HEADER_OFFSET = "calc(3rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))";

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
  const isDesktop = useIsDesktop();
  return isDesktop ? <FollowsDesktop /> : <FollowsPhone />;
}

function FollowsPhone(): ReactElement {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab = readTab(params.get("tab"));
  const activeIndex = TAB_ORDER.indexOf(tab);
  // The same queries the panels read, so the counts cost no request and match the rows below.
  const { data: following } = useFollowing();
  const { data: followers } = useFollowers();
  const followingCount = following?.filter((row) => row.relation === "FOLLOWING").length;
  const followersCount = followers?.filter((row) => row.status === "ACCEPTED").length;

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
        root: {
          "--tab-border-color": "var(--color-text-900)",
          display: "flex",
          flexDirection: "column",
          minHeight: `calc(100dvh - ${HEADER_OFFSET})`,
        },
        tab: { borderBottomWidth: 3, "--tab-hover-color": "transparent" },
      }}
      color="primary.6"
    >
      <Tabs.List grow>
        <Tabs.Tab value="following" c={tab === "following" ? "text.6" : "text.8"}>
          <FollowsTabLabel label={t("follow.tabFollowing")} count={followingCount} />
        </Tabs.Tab>
        <Tabs.Tab value="followers" c={tab === "followers" ? "text.6" : "text.8"}>
          <FollowsTabLabel label={t("follow.tabFollowers")} count={followersCount} />
        </Tabs.Tab>
      </Tabs.List>

      {/* pan-y leaves vertical scrolling to the browser and hands the sideways gesture here. */}
      <Box className="flex-1 overflow-hidden" style={{ touchAction: "pan-y" }} {...swipe.handlers}>
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
