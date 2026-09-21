import type { ReactElement } from "react";
import { Box, Button } from "@mantine/core";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import { useHideOnScrollDown } from "@/hooks/useHideOnScrollDown";
import { CONTENT_MAX_WIDTH } from "./contentWidth";

interface FabAction {
  labelKey: string;
  path: string;
}

// One named action per tab, no menu: the button says what it does. Home leads to logging
// a service, the core of the app; a new bike has its own door in the garage strip.
const FAB_ACTIONS: Record<string, FabAction> = {
  "/": { labelKey: "fab.addService", path: "/service/new" },
  "/bikes": { labelKey: "fab.addBike", path: "/bikes/new" },
  "/service": { labelKey: "fab.addService", path: "/service/new" },
};

// Clears the footer pill using its matching safe-area inset expression.
const FAB_BOTTOM_OFFSET =
  "calc(4rem + 0.4rem + 0.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)) + 1rem)";

// Sits at the phone's edge, and at the column's edge once the page is narrower than the window.
const FAB_RIGHT_OFFSET = `max(1.5rem, calc((100vw - ${CONTENT_MAX_WIDTH}) / 2 + 1.5rem))`;

const FAB_HEIGHT = 48;

// Moves the hidden button beyond the bottom edge.
const FAB_HIDDEN_SHIFT = `calc(${FAB_HEIGHT}px + 1rem)`;

function getAction(pathname: string): FabAction | null {
  // Matches Home exactly and other sections by route prefix.
  const match = Object.keys(FAB_ACTIONS).find((path) => (path === "/" ? pathname === "/" : pathname.startsWith(path)));
  return match ? FAB_ACTIONS[match] : null;
}

// Renders the shared create-action entry point: a pill with a label, not an anonymous plus.
export function Fab(): ReactElement | null {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  // Runs before early returns to preserve hook order.
  const visible = useHideOnScrollDown();

  const action = getAction(location.pathname);

  // Omits the button in sections without a create action.
  if (action === null) return null;

  return (
    // Fixed by hand rather than through Affix, which rewrites a `max()` offset into nonsense.
    <Box
      style={{
        position: "fixed",
        bottom: FAB_BOTTOM_OFFSET,
        right: FAB_RIGHT_OFFSET,
        zIndex: 200,
        // Moves offscreen and disables taps when hidden.
        transform: visible ? "translateY(0)" : `translateY(${FAB_HIDDEN_SHIFT})`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "transform 0.25s ease, opacity 0.25s ease",
      }}
    >
      <Button
        color="primary.6"
        c="textDark.6"
        radius="xl"
        h={FAB_HEIGHT}
        px="lg"
        leftSection={<Plus size={20} strokeWidth={2.5} />}
        onClick={() => {
          tapFeedback();
          navigate(action.path);
        }}
        className="active:scale-[0.97]"
        styles={{
          root: {
            boxShadow: "0 8px 24px -6px color-mix(in srgb, var(--mantine-color-primary-6) 55%, transparent)",
            transition: "transform 0.12s ease",
          },
          label: { fontWeight: 700, fontSize: "0.9375rem" },
        }}
      >
        {t(action.labelKey)}
      </Button>
    </Box>
  );
}
