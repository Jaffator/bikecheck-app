// The desktop shell's navigation: what the tab bar, the FAB, the More sheet and the header's
// bell and avatar hold on a phone, in one fixed column (ADR 0035).
import { useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { AppShell, Avatar, Box, Button, Divider, Menu, Stack, Text } from "@mantine/core";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, MessageCircleMore, Plus, Users } from "lucide-react";
import Logo from "@/assets/icons/bikecheck/Logo_white.svg?react";
import { useCurrentUser } from "@/features/users/users.queries";
import { useUnreadNotifications } from "@/features/notifications/notifications.queries";
import { usePendingRides } from "@/features/strava/strava.queries";
import { useMyProfile } from "@/features/profile/profile.queries";
import { Eyebrow } from "@/components/Eyebrow";
import { BADGE_CAP } from "./HeaderCountBadge";
import { ADD_BIKE, ADD_SERVICE, NAV_ITEMS, TAB_STROKE, TAB_STROKE_ACTIVE, isActivePath } from "./navItems";

// Larger than the mobile header's 20: the column has room for it.
const LOGO_HEIGHT = 26;
const ICON_SIZE = 20;

const SAFE_TOP = "var(--safe-area-inset-top, env(safe-area-inset-top, 0px))";
const SAFE_BOTTOM = "var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))";

const AVATAR_STYLE = {
  "--avatar-bg": "var(--mantine-color-cards-5)",
  "--avatar-color": "var(--mantine-color-text-6)",
} as CSSProperties;

interface SidebarRowProps {
  to: string;
  active: boolean;
  icon: ReactNode;
  label: ReactNode;
  // A dot or a count at the row's end.
  trailing?: ReactNode;
}

// A plain link, not a Mantine button: Mantine's unlayered CSS would beat the hover class.
function SidebarRow({ to, active, icon, label, trailing }: SidebarRowProps): ReactElement {
  const tone = active ? "bg-primary-600/15 text-primary-500" : "text-text-700 hover:bg-cards-600";
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={`relative flex h-10 items-center gap-3 rounded-lg px-3 transition-colors duration-150 ${tone}`}
    >
      {/* Sits on the column's edge, outside the row's padding (px="sm"). */}
      {active && <span className="absolute -left-3 top-2 bottom-2 w-0.75 rounded-r-full bg-primary-500" />}
      {icon}
      <Text fz={14} fw={active ? 600 : 500} lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
        {label}
      </Text>
      {trailing}
    </Link>
  );
}

// A quiet grey pill: in the column a count is information, not an alarm.
function SidebarCount({ count }: { count: number }): ReactElement | null {
  if (count <= 0) return null;
  return (
    <Box miw={22} h={20} px={6} bg="cards.5" className="flex items-center justify-center" style={{ borderRadius: "9999px" }}>
      <Text className="tabular-nums" fz={11} fw={600} c="var(--color-text-dim)" lh={1}>
        {count > BADGE_CAP ? `${BADGE_CAP}+` : count}
      </Text>
    </Box>
  );
}

function SidebarSectionLabel({ children }: { children: ReactNode }): ReactElement {
  return (
    <Box px="sm" mt="lg" mb={6}>
      <Eyebrow>{children}</Eyebrow>
    </Box>
  );
}

// Avatar, name and garage line; the whole row opens the settings.
function UserRow({ active }: { active: boolean }): ReactElement {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const tone = active ? "bg-primary-600/15" : "hover:bg-cards-600";
  return (
    <Link
      to="/settings"
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 ${tone}`}
    >
      {/* name drives the initials fallback when the user has no picture */}
      <Avatar src={user?.avatar_url} name={user?.name} radius="xl" size={34} style={AVATAR_STYLE} />
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Text fz={14} fw={600} c="text.6" lineClamp={1}>
          {user?.name ?? t("page.settings")}
        </Text>
        <Text fz={12} c="var(--color-text-dim)" lineClamp={1}>
          {t("nav.personalGarage")}
        </Text>
      </Box>
    </Link>
  );
}

const EASE_OUT = "cubic-bezier(0.2, 0.8, 0.2, 1)";

// Drops from the button and settles; a scale from Mantine's presets would grow out of the middle.
const DROP_TRANSITION = {
  in: { opacity: 1, transform: "none" },
  out: { opacity: 0, transform: "translateY(-6px) scale(0.97)" },
  common: { transformOrigin: "top center" },
  transitionProperty: "opacity, transform",
};

// Service first: it is the everyday entry, a bike is added once in a while.
const CREATE_TILES = [
  { action: ADD_SERVICE, shortKey: "nav.newService" },
  { action: ADD_BIKE, shortKey: "nav.newBike" },
];

interface NewMenuProps {
  opened: boolean;
  onChange: (opened: boolean) => void;
}

// Every create action from any page; the FAB's per-page offer has no place to stand here.
// Two tiles on frosted glass; the column behind them steps back while it is open.
function NewMenu({ opened, onChange }: NewMenuProps): ReactElement {
  const { t } = useTranslation();
  return (
    <Menu
      opened={opened}
      onChange={onChange}
      position="bottom"
      width="target"
      offset={8}
      transitionProps={{ transition: DROP_TRANSITION, duration: 220, exitDuration: 140, timingFunction: EASE_OUT }}
    >
      <Menu.Target>
        <Button
          fullWidth
          h={40}
          color="primary.6"
          c="textDark.6"
          radius={10}
          leftSection={
            <Plus
              size={17}
              strokeWidth={2.5}
              style={{
                // Turns into a close mark, so the same button reads as the way back out.
                transform: opened ? "rotate(45deg)" : "none",
                transition: "transform 280ms cubic-bezier(0.34, 1.4, 0.64, 1)",
              }}
            />
          }
          style={{ boxShadow: "0 4px 18px color-mix(in srgb, var(--mantine-color-primary-6) 25%, transparent)" }}
        >
          {t("nav.new")}
        </Button>
      </Menu.Target>
      <Menu.Dropdown
        p={6}
        style={{
          borderRadius: 14,
          backgroundColor: "rgba(30, 29, 27, 0.78)",
          backdropFilter: "blur(18px) saturate(1.2)",
          WebkitBackdropFilter: "blur(18px) saturate(1.2)",
          border: "1px solid var(--color-border-strong)",
          boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.75)",
        }}
      >
        <Box className="grid grid-cols-2 gap-1.5">
          {CREATE_TILES.map(({ action: { labelKey, path, icon: Icon }, shortKey }) => (
            <Menu.Item
              key={path}
              component={Link}
              to={path}
              // The tile shows the short word under the menu's own "Add"; a reader hears it whole.
              aria-label={t(labelKey)}
              // A resting tint by class: Mantine's own hover rule still wins over it.
              className="bg-white/[0.035]"
              styles={{
                item: {
                  "--menu-item-hover": "color-mix(in srgb, var(--mantine-color-primary-6) 12%, transparent)",
                  flexDirection: "column",
                  gap: 8,
                  padding: "14px 6px 12px",
                  borderRadius: 10,
                  color: "var(--mantine-color-text-3)",
                } as CSSProperties,
                itemSection: { marginInline: 0 },
                itemLabel: { flex: "none", fontSize: 13, fontWeight: 600 },
              }}
              leftSection={<Icon size={28} color="var(--mantine-color-primary-6)" aria-hidden />}
            >
              {t(shortKey)}
            </Menu.Item>
          ))}
        </Box>
      </Menu.Dropdown>
    </Menu>
  );
}

export function Sidebar(): ReactElement {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { data: unreadNotifications } = useUnreadNotifications();
  const unreadCount = unreadNotifications?.length ?? 0;
  const { data: pendingRides } = usePendingRides();
  const pendingRideCount = pendingRides?.length ?? 0;
  const { data: profile } = useMyProfile();
  const pendingRequests = profile?.stats.pending_requests ?? 0;
  const [newMenuOpened, setNewMenuOpened] = useState(false);

  // Rides waiting for a bike; the rides row still opens the Assigned tab.
  const navCounts: Record<string, number> = { "/rides": pendingRideCount };

  return (
    <AppShell.Navbar
      withBorder={false}
      bg="var(--color-surface-well)"
      px="sm"
      style={{
        paddingTop: SAFE_TOP,
        paddingBottom: `calc(var(--mantine-spacing-sm) + ${SAFE_BOTTOM})`,
        borderInlineEnd: "1px solid var(--color-border-subtle)",
      }}
    >
      <AppShell.Section>
        {/* Same gap above and below the mark, so it sits centred between the edge and the button. */}
        <Box py="lg" px="xs" className="flex items-center justify-center">
          <Logo style={{ height: LOGO_HEIGHT, width: "auto" }} />
        </Box>
        <NewMenu opened={newMenuOpened} onChange={setNewMenuOpened} />
      </AppShell.Section>

      {/* Bled out to the column edge, so the scroll box does not clip the active bar. Steps back
          under the open menu, so the overlap reads as layering rather than a collision. */}
      <AppShell.Section
        grow
        mt="lg"
        mx="-sm"
        px="sm"
        style={{
          overflowY: "auto",
          opacity: newMenuOpened ? 0.28 : 1,
          filter: newMenuOpened ? "blur(1.5px)" : "none",
          transition: `opacity 200ms ${EASE_OUT}, filter 200ms ${EASE_OUT}`,
        }}
      >
        <Stack gap={2}>
          {NAV_ITEMS.map(({ labelKey, path, icon: Icon, icon_fill: IconFill }) => {
            // The More tab is the phone's way to Riders and Chat, which have rows of their own here.
            if (path === null) return null;
            const active = isActivePath(path, pathname);
            const RowIcon = active ? (IconFill ?? Icon) : Icon;
            return (
              <SidebarRow
                key={path}
                to={path}
                active={active}
                icon={<RowIcon size={ICON_SIZE} strokeWidth={active ? TAB_STROKE_ACTIVE : TAB_STROKE} />}
                label={t(labelKey)}
                trailing={<SidebarCount count={navCounts[path] ?? 0} />}
              />
            );
          })}
        </Stack>
        <SidebarSectionLabel>{t("nav.community")}</SidebarSectionLabel>
        <Stack gap={2}>
          <SidebarRow
            to="/follows"
            active={isActivePath("/follows", pathname)}
            icon={<Users size={ICON_SIZE} strokeWidth={TAB_STROKE} />}
            label={t("page.follows")}
            trailing={
              // The More tab's dot, not a figure (#158).
              pendingRequests > 0 && (
                <Box
                  w={7}
                  h={7}
                  mr={6}
                  role="status"
                  aria-label={t("follow.requestsTitle")}
                  style={{ borderRadius: "9999px", backgroundColor: "var(--mantine-color-primary-6)" }}
                />
              )
            }
          />
          <SidebarRow
            to="/chat"
            active={isActivePath("/chat", pathname)}
            icon={<MessageCircleMore size={ICON_SIZE} strokeWidth={TAB_STROKE} />}
            label={t("page.chat")}
          />
        </Stack>
      </AppShell.Section>

      <AppShell.Section>
        <Divider mb="sm" color="var(--color-border-subtle)" />
        <Stack gap={4}>
          <SidebarRow
            to="/notifications"
            active={isActivePath("/notifications", pathname)}
            icon={<Bell size={ICON_SIZE} strokeWidth={TAB_STROKE} />}
            label={t("page.notifications")}
            trailing={<SidebarCount count={unreadCount} />}
          />
          <UserRow active={isActivePath("/settings", pathname)} />
        </Stack>
      </AppShell.Section>
    </AppShell.Navbar>
  );
}
