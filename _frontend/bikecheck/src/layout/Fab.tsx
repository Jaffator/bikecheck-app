import { useState, type ReactElement } from "react";
import { ActionIcon, Affix, Group, Stack, Transition, UnstyledButton } from "@mantine/core";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GoPlus } from "react-icons/go";
import { tapFeedback } from "@/utils/haptics";
import { useHideOnScrollDown } from "@/hooks/useHideOnScrollDown";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import { ADD_BIKE, ADD_SERVICE, type CreateAction } from "./navItems";

// Defines create actions for sections supported by backend endpoints.
const FAB_ACTIONS: Record<string, CreateAction[]> = {
  "/": [ADD_BIKE, ADD_SERVICE],
  "/bikes": [ADD_BIKE],
  "/service": [ADD_SERVICE],
};

// Clears the footer pill using its matching safe-area inset expression.
const FAB_BOTTOM_OFFSET =
  "calc(4rem + 0.4rem + 0.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)) + 1rem)";

const FAB_SIZE = 55;

// Moves the hidden button beyond the bottom edge.
const FAB_HIDDEN_SHIFT = `calc(${FAB_SIZE}px + 1rem)`;

// Separates the FAB and its speed dial.
const MENU_OFFSET = 16;

// Separates speed-dial actions.
const MENU_ITEM_GAP = 10;

const MENU_ITEM_HEIGHT = 52;

// The plus turns into a cross while the dial is open.
const FAB_EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";

function getActions(pathname: string): CreateAction[] {
  // Matches Home exactly and other sections by route prefix.
  const match = Object.keys(FAB_ACTIONS).find((path) => (path === "/" ? pathname === "/" : pathname.startsWith(path)));
  return match ? FAB_ACTIONS[match] : [];
}

interface FabProps {
  // Lets AppLayout dim the screen behind the open dial.
  menuOpened: boolean;
  onMenuOpenedChange: (opened: boolean) => void;
}

// Renders the shared create-action entry point: a speed dial of pills stacked over the button.
export function Fab({ menuOpened, onMenuOpenedChange }: FabProps): ReactElement | null {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  // Runs before early returns to preserve hook order.
  const visible = useHideOnScrollDown();
  const [openedOn, setOpenedOn] = useState(location.pathname);
  // Android's back gesture closes the dial rather than leaving the page.
  useOverlayBack(menuOpened, () => onMenuOpenedChange(false));

  const actions = getActions(location.pathname);
  const opened = menuOpened && visible;

  // Closes the menu when its route changes or button hides.
  if (menuOpened && (!visible || openedOn !== location.pathname)) {
    onMenuOpenedChange(false);
  }
  if (openedOn !== location.pathname) {
    setOpenedOn(location.pathname);
  }

  // Omits the button in sections without create actions.
  if (actions.length === 0) return null;

  function toggle(): void {
    tapFeedback();
    onMenuOpenedChange(!menuOpened);
  }

  function go(path: string): void {
    tapFeedback();
    // Closing here first would commit before the deferred route and flash the old page.
    navigate(path);
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
      <Stack align="flex-end" gap={MENU_OFFSET}>
        <Transition mounted={opened} transition="pop-bottom-right" duration={220} timingFunction={FAB_EASING}>
          {(style) => (
            <Stack role="menu" aria-label={t("fab.open")} align="flex-end" gap={MENU_ITEM_GAP} style={style}>
              {actions.map(({ labelKey, path, icon: Icon }) => (
                <UnstyledButton
                  key={path}
                  role="menuitem"
                  onClick={() => go(path)}
                  className="active:scale-[0.97]"
                  h={MENU_ITEM_HEIGHT}
                  pl={18}
                  pr={22}
                  fz={15}
                  fw={600}
                  c="text.6"
                  style={{
                    borderRadius: 999,
                    backgroundColor: "var(--mantine-color-cards-6)",
                    border: "1px solid var(--mantine-color-cards-5)",
                    boxShadow: "0 10px 28px rgba(0, 0, 0, 0.45)",
                    transition: "transform 0.12s ease",
                  }}
                >
                  <Group gap={12} wrap="nowrap" h="100%">
                    <Icon size={20} />
                    {t(labelKey)}
                  </Group>
                </UnstyledButton>
              ))}
            </Stack>
          )}
        </Transition>
        <ActionIcon
          color="primary.6"
          c="textDark.6"
          radius="xl"
          size={FAB_SIZE}
          aria-label={menuOpened ? t("action.close") : t("fab.open")}
          aria-haspopup="menu"
          aria-expanded={menuOpened}
          onClick={toggle}
          style={{ boxShadow: "0 0 10px 0 color-mix(in srgb, var(--mantine-color-primary-6) 35%, transparent)" }}
        >
          <GoPlus
            size={35}
            style={{
              transition: `transform 0.22s ${FAB_EASING}`,
              transform: menuOpened ? "rotate(45deg)" : "rotate(0deg)",
            }}
          />
        </ActionIcon>
      </Stack>
    </Affix>
  );
}
