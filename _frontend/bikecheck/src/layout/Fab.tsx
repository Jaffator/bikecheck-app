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
import { bikecheckIconType } from "@/assets/icons/bikecheck";

const BikecheckIcon = bikecheckIconType("Bikecheck");

interface FabAction {
  labelKey: string;
  path: string;
  icon: IconType;
}

// Defines create actions for sections supported by backend endpoints.
const FAB_ACTIONS: Record<string, FabAction[]> = {
  "/": [
    { labelKey: "fab.addBike", path: "/bikes/new", icon: PiPersonSimpleBike },
    { labelKey: "fab.addService", path: "/service/new", icon: RiWrenchLine },
  ],
  "/bikes": [{ labelKey: "fab.addBike", path: "/bikes/new", icon: PiPersonSimpleBike }],
  "/service": [{ labelKey: "fab.addService", path: "/service/new", icon: BikecheckIcon! }],
};

// Clears the footer pill using its matching safe-area inset expression.
const FAB_BOTTOM_OFFSET =
  "calc(4rem + 0.4rem + 0.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)) + 1rem)";

const FAB_SIZE = 55;

// Moves the hidden button beyond the bottom edge.
const FAB_HIDDEN_SHIFT = `calc(${FAB_SIZE}px + 1rem)`;

// Separates the FAB and its dropdown.
const MENU_OFFSET = 16;

// Separates dropdown action items.
const MENU_ITEM_GAP = 8;

function getActions(pathname: string): FabAction[] {
  // Matches Home exactly and other sections by route prefix.
  const match = Object.keys(FAB_ACTIONS).find((path) => (path === "/" ? pathname === "/" : pathname.startsWith(path)));
  return match ? FAB_ACTIONS[match] : [];
}

interface FabProps {
  // Lets AppLayout dim page content behind the portalled menu.
  menuOpened: boolean;
  onMenuOpenedChange: (opened: boolean) => void;
}

// Renders the shared create-action entry point.
export function Fab({ menuOpened, onMenuOpenedChange }: FabProps): ReactElement | null {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  // Runs before early returns to preserve hook order.
  const visible = useHideOnScrollDown();
  const [openedOn, setOpenedOn] = useState(location.pathname);

  const actions = getActions(location.pathname);

  // Closes the menu when its route changes or button hides.
  if (menuOpened && (!visible || openedOn !== location.pathname)) {
    onMenuOpenedChange(false);
  }
  if (openedOn !== location.pathname) {
    setOpenedOn(location.pathname);
  }

  // Omits the button in sections without create actions.
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
      // Moves offscreen and disables taps when hidden.
      style={{
        transform: visible ? "translateY(0)" : `translateY(${FAB_HIDDEN_SHIFT})`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "transform 0.25s ease, opacity 0.25s ease",
      }}
    >
      {/* Uses a controlled menu so it closes with the hidden FAB. */}
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
            border: "1px solid var(--mantine-color-cards-5)",
            boxShadow: "0 0 10px 0 color-mix(in srgb, var(--mantine-color-text-9) 35%, transparent)",
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
