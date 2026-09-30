// Wraps a list in the pull gesture. The indicator sits just above the first card and is
// uncovered by the pull itself, so nothing is ever drawn over a ride.
import type { ReactElement, ReactNode } from "react";
import { Box, Loader } from "@mantine/core";
import { RefreshCw } from "lucide-react";
import type { PullToRefresh } from "@/hooks/usePullToRefresh";

// Just off the top, so the pull uncovers the indicator instead of fading it over the first card.
const INDICATOR_OFFSET_PX = 40;

export function PullFrame({ attach, refreshing, children }: PullToRefresh & { children: ReactNode }): ReactElement {
  return (
    <Box ref={attach} style={{ overscrollBehaviorY: "contain" }}>
      {/* Reads the pull from CSS vars on the element above, so a finger re-renders no card. */}
      <Box
        pos="relative"
        style={{
          transform: "translate3d(0, var(--pull, 0px), 0)",
          transition: "var(--pull-transition, none)",
        }}
      >
        <Box
          pos="absolute"
          left={0}
          right={0}
          top={-INDICATOR_OFFSET_PX}
          className="flex justify-center"
          style={{ opacity: "var(--pull-progress, 0)" }}
        >
          {refreshing ? (
            <Loader size="sm" />
          ) : (
            /* Turns with the pull, so the arrow is upright exactly when letting go reloads. */
            <RefreshCw
              size={20}
              color="var(--color-text-dim)"
              style={{ transform: "rotate(calc(var(--pull-progress, 0) * 180deg))" }}
            />
          )}
        </Box>
        {children}
      </Box>
    </Box>
  );
}
