// The desktop shell's navigation: what the tab bar, the FAB, the More sheet and the header's
// bell and avatar hold on a phone, in one fixed column (ADR 0035).
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { AppShell, Avatar, Box, Button, Divider, Menu, Stack, Text } from "@mantine/core";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, ChevronDown, MessageCircleMore, Plus, Users } from "lucide-react";
import Logo from "@/assets/icons/bikecheck/Logo_white.svg?react";
import { useCurrentUser } from "@/features/users/users.queries";
import { useUnreadNotifications } from "@/features/notifications/notifications.queries";
import { useMyProfile } from "@/features/profile/profile.queries";
import { HeaderCountBadge } from "./HeaderCountBadge";
import { ADD_BIKE, ADD_SERVICE, NAV_ITEMS, TAB_STROKE, TAB_STROKE_ACTIVE, isActivePath } from "./navItems";

// The same mark the mobile header wears on Home, at the same size.
const LOGO_HEIGHT = 20;
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
  const tone = active ? "bg-primary-600/20 text-primary-500" : "text-text-600 hover:bg-cards-600";
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={`flex h-10 items-center gap-3 rounded-lg px-3 transition-colors duration-150 ${tone}`}
    >
      {icon}
      <Text fz={14} fw={500} lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
        {label}
      </Text>
      {trailing}
    </Link>
  );
}

// Every create action from any page; the FAB's per-page offer has no place to stand here.
function NewMenu(): ReactElement {
  const { t } = useTranslation();
  return (
    <Menu position="bottom-start" width="target" radius="md" offset={6}>
      <Menu.Target>
        <Button
          fullWidth
          color="primary.6"
          c="textDark.6"
          radius="md"
          leftSection={<Plus size={18} />}
          rightSection={<ChevronDown size={16} />}
        >
          {t("nav.new")}
        </Button>
      </Menu.Target>
      <Menu.Dropdown
        bg="cards.6"
        p={6}
        style={{
          border: "1px solid var(--mantine-color-cards-5)",
          boxShadow: "0 0 10px 0 color-mix(in srgb, var(--mantine-color-text-9) 35%, transparent)",
        }}
      >
        {[ADD_BIKE, ADD_SERVICE].map(({ labelKey, path, icon: Icon }) => (
          <Menu.Item key={path} color="text" fw={600} leftSection={<Icon size={18} />} component={Link} to={path}>
            {t(labelKey)}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

export function Sidebar(): ReactElement {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { data: user } = useCurrentUser();
  const { data: unreadNotifications } = useUnreadNotifications();
  const unreadCount = unreadNotifications?.length ?? 0;
  const { data: profile } = useMyProfile();
  const pendingRequests = profile?.stats.pending_requests ?? 0;

  return (
    <AppShell.Navbar
      withBorder={false}
      bg="background.8"
      px="sm"
      style={{
        paddingTop: SAFE_TOP,
        paddingBottom: `calc(var(--mantine-spacing-sm) + ${SAFE_BOTTOM})`,
        borderInlineEnd: "1px solid var(--color-border-subtle)",
      }}
    >
      <AppShell.Section>
        {/* The header's height, so the mark sits level with the page title beside it. */}
        <Box h="3rem" px="xs" className="flex items-center">
          <Logo style={{ height: LOGO_HEIGHT, width: "auto" }} />
        </Box>
        <NewMenu />
      </AppShell.Section>

      <AppShell.Section grow mt="md" style={{ overflowY: "auto" }}>
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
              />
            );
          })}
        </Stack>
        <Divider my="sm" color="var(--color-border-subtle)" />
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
        <Stack gap={2}>
          <SidebarRow
            to="/notifications"
            active={isActivePath("/notifications", pathname)}
            icon={<Bell size={ICON_SIZE} strokeWidth={TAB_STROKE} />}
            label={t("page.notifications")}
            // The badge pins itself to its box's corner, so the box is sized to centre it.
            trailing={
              <Box pos="relative" w={20} h={20}>
                <HeaderCountBadge count={unreadCount} />
              </Box>
            }
          />
          <SidebarRow
            to="/settings"
            active={isActivePath("/settings", pathname)}
            // name drives the initials fallback when the user has no picture
            icon={<Avatar src={user?.avatar_url} name={user?.name} radius="xl" size={26} style={AVATAR_STYLE} />}
            label={user?.name ?? t("page.settings")}
          />
        </Stack>
      </AppShell.Section>
    </AppShell.Navbar>
  );
}
