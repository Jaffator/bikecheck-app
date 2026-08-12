import { useState, type ReactElement } from "react";
import { ActionIcon, Affix, Menu, Stack } from "@mantine/core";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GoPlus } from "react-icons/go";
import { PiPersonSimpleBike } from "react-icons/pi";
import { RiWrenchLine } from "react-icons/ri";
import type { IconType } from "react-icons";
import { tapFeedback } from "@/utils/haptics";
import { useHideOnScrollDown } from "@/hooks/useHideOnScrollDown";

interface FabAction {
  labelKey: string;
  path: string;
  icon: IconType;
}

// Create actions per section. Only what the backend can actually create has an
// entry: bikes (POST /bike/create) and service records (POST /bike-event/create).
// Rides come in from Strava, so they are absent — and so is /rides itself.
const FAB_ACTIONS: Record<string, FabAction[]> = {
  "/": [
    { labelKey: "fab.addBike", path: "/bikes/new", icon: PiPersonSimpleBike },
    { labelKey: "fab.addService", path: "/service/new", icon: RiWrenchLine },
  ],
  "/bikes": [{ labelKey: "fab.addBike", path: "/bikes/new", icon: PiPersonSimpleBike }],
  "/service": [{ labelKey: "fab.addService", path: "/service/new", icon: RiWrenchLine }],
};

// Clearance above the tab bar pill, measured from the bottom of the viewport:
//   4rem    the AppShell.Footer box (fixed to bottom: 0)
//   0.4rem  the pill's overflow — it is h="110%" of that 4rem box
//   0.75rem the footer's own margin-bottom
//   inset   the home indicator
//   1rem    the gap between the FAB and the pill
// Keep the inset expression identical to the footer's — a different fallback
// would drift the two apart on devices with a home indicator.
const FAB_BOTTOM_OFFSET =
  "calc(4rem + 0.4rem + 0.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)) + 1rem)";

const FAB_SIZE = 55;

// How far the FAB drops when hiding. Its own height plus the gap is enough to
// clear the bottom edge; adding the full offset again would double the distance
// and make the slide read as sluggish.
const FAB_HIDDEN_SHIFT = `calc(${FAB_SIZE}px + 1rem)`;

// Gap between the FAB and the dropdown above it.
const MENU_OFFSET = 16;

// Gap between the action items inside the dropdown.
const MENU_ITEM_GAP = 8;

function getActions(pathname: string): FabAction[] {
  // Exact match for "/" so it does not swallow every other route, prefix match
  // for the rest — same rule the tab bar uses for the active tab.
  const match = Object.keys(FAB_ACTIONS).find((path) => (path === "/" ? pathname === "/" : pathname.startsWith(path)));
  return match ? FAB_ACTIONS[match] : [];
}

interface FabProps {
  // Lifted to AppLayout so it can dim the Outlet behind the dropdown without
  // Mantine's own overlay, which portals to the viewport and would cover the
  // header/footer/Fab too.
  menuOpened: boolean;
  onMenuOpenedChange: (opened: boolean) => void;
}

// The create-action entry point. Lives in the layout rather than in each page so
// the offset above the tab bar is worked out once.
export function Fab({ menuOpened, onMenuOpenedChange }: FabProps): ReactElement | null {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  // Every hook runs before the early return below — React requires the same
  // hook order on every render.
  const visible = useHideOnScrollDown();
  const [openedOn, setOpenedOn] = useState(location.pathname);

  const actions = getActions(location.pathname);

  // The menu must close when the FAB hides and when the route changes. Both are
  // adjustments to state already held, so they are made during render rather
  // than in an effect — the portal keeps the dropdown outside this element, and
  // a surviving `true` would spring it back open on the next scroll up.
  if (menuOpened && (!visible || openedOn !== location.pathname)) {
    onMenuOpenedChange(false);
  }
  if (openedOn !== location.pathname) {
    setOpenedOn(location.pathname);
  }

  // Sections with nothing to create (Rides) get no button at all.
  if (actions.length === 0) return null;

  function go(path: string): void {
    tapFeedback();
    navigate(path);
  }

  function trigger(label: string): ReactElement {
    return (
      <ActionIcon
        color="primary.6"
        c="textDark.6"
        radius="xl"
        size={FAB_SIZE}
        aria-label={label}
        style={{ boxShadow: "0 0 10px 0 color-mix(in srgb, var(--mantine-color-primary-6) 45%, transparent)" }}
      >
        <GoPlus size={35} />
      </ActionIcon>
    );
  }

  return (
    <Affix
      position={{ bottom: FAB_BOTTOM_OFFSET, right: 35 }}
      // Slides down past the tab bar rather than fading, and stops taking taps
      // once it is out of sight.
      style={{
        transform: visible ? "translateY(0)" : `translateY(${FAB_HIDDEN_SHIFT})`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "transform 0.25s ease, opacity 0.25s ease",
      }}
    >
      {/* offset lifts the dropdown clear of the FAB; the taller items and the
          gap between them keep the list comfortable to hit with a thumb. */}
      {/* Controlled so hiding the FAB takes the dropdown with it — the portal
          renders it outside this element, so it would otherwise stay on screen
          after the button slid away. */}
      <Menu
        opened={menuOpened && visible}
        onChange={onMenuOpenedChange}
        position="top-end"
        radius="md"
        offset={MENU_OFFSET}
        onOpen={tapFeedback}
        withinPortal
      >
        <Menu.Target>{trigger(t("fab.open"))}</Menu.Target>
        <Menu.Dropdown
          bg="cards.6"
          p={8}
          style={{
            border: "none",
            boxShadow: "0 0 10px 0 color-mix(in srgb, var(--mantine-color-primary-6) 35%, transparent)",
          }}
        >
          <Stack gap={MENU_ITEM_GAP}>
            {actions.map(({ labelKey, path, icon: Icon }) => (
              <Menu.Item color="text" key={path} py={12} fw={600} leftSection={<Icon size={20} />} onClick={() => go(path)}>
                {t(labelKey)}
              </Menu.Item>
            ))}
          </Stack>
        </Menu.Dropdown>
      </Menu>
    </Affix>
  );
}
