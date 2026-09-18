// PROTOTYPE #128 — throwaway. The Follows sub-page (/follows, pattern: /reports): title,
// the two tabs drawn and swiped the way /rides draws its own, the bodies in their settled
// shape (#128 winner: panels). ?tab=followers is the address the dashboard figures and
// the notifications point at.
import { useCallback, useEffect, type ReactElement, type ReactNode } from "react";
import { Box, Tabs, Text } from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import { SETTLE_MS, useSwipePanels } from "@/hooks/useSwipePanels";
import { useHeaderStore } from "@/store/store";
import { useFollowsModel, type FollowsTab } from "./follows.model";
import { FollowersPanels, FollowingPanels } from "./FollowsVariantPanels";

// Panel order, which is also the order a swipe moves through them.
const TAB_ORDER: FollowsTab[] = ["following", "followers"];

function readTab(value: string | null): FollowsTab {
  return value === "followers" ? "followers" : "following";
}

// One panel of the swipe track, as /rides keeps its own: hidden rather than unmounted
// while it is not the one being read, so its scroll position survives a swipe away.
function SwipePanel({ current, moving, children }: { current: boolean; moving: boolean; children: ReactNode }): ReactElement {
  return (
    <Box className="min-w-0 shrink-0 basis-full" style={{ visibility: current || moving ? "visible" : "hidden" }}>
      {children}
    </Box>
  );
}

export function Follows(): ReactElement {
  const [params, setParams] = useSearchParams();
  const tab = readTab(params.get("tab"));
  const activeIndex = TAB_ORDER.indexOf(tab);
  const setTitleSlot = useHeaderStore((state) => state.setTitleSlot);
  const model = useFollowsModel();

  // No translation key yet: the title is written straight into the header's slot.
  useEffect(() => {
    setTitleSlot(
      <Text fw={700} size="lg" c="text.6">
        Sledování
      </Text>,
    );
    return () => setTitleSlot(null);
  }, [setTitleSlot]);

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
          Sledovaní
        </Tabs.Tab>
        <Tabs.Tab value="followers" c={tab === "followers" ? "text.6" : "text.8"}>
          Sledující
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
            <FollowingPanels model={model} />
          </SwipePanel>
          <SwipePanel current={tab === "followers"} moving={swipe.moving}>
            <FollowersPanels model={model} />
          </SwipePanel>
        </Box>
      </Box>
    </Tabs>
  );
}
