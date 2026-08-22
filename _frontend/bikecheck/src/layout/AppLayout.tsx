import { useState, type ReactElement } from "react";
import { ActionIcon, AppShell, Avatar, Box, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useLocation, useNavigate, useOutlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Settings, Bell, ArrowLeft } from "lucide-react";
import { GoHomeFill, GoHome } from "react-icons/go";
import { RiWrenchFill, RiWrenchLine } from "react-icons/ri";
import { PiPath, PiPathBold } from "react-icons/pi";
import { PiPersonSimpleBike, PiPersonSimpleBikeBold } from "react-icons/pi";
import type { IconType } from "react-icons";
import { App } from "@capacitor/app";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useAndroidBackButton } from "../hooks/useAndroidBackButton";
import { useStravaDeepLink } from "../hooks/useStravaDeepLink";
import { OfflinePage } from "@/features/offline_page/OfflinePage";
import { useOfflineWhenCallApiStore, useHeaderStore } from "@/store/store";
import { useCurrentUser } from "@/features/users/users.queries";
import { useUnreadNotifications } from "@/features/notifications/notifications.queries";
import { tapFeedback } from "@/utils/haptics";
import { Fab } from "./Fab";

interface NavItem {
  labelKey: string;
  path: string;
  icon: IconType;
  icon_fill?: IconType;
}

// Defines available navigation tabs by stable route paths.
const NAV_ITEMS: NavItem[] = [
  { labelKey: "nav.home", path: "/", icon: GoHome, icon_fill: GoHomeFill },
  {
    labelKey: "nav.bikes",
    path: "/bikes",
    icon: PiPersonSimpleBike,
    icon_fill: PiPersonSimpleBikeBold,
  },
  {
    labelKey: "nav.service",
    path: "/service",
    // Uses the service tab outline icon.
    icon: RiWrenchLine,
    icon_fill: RiWrenchFill,
  },
  {
    labelKey: "nav.rides",
    path: "/rides",
    icon: PiPath,
    icon_fill: PiPathBold,
  },
];

// Maps routes to translated header titles; Home intentionally has none.
const PAGE_TITLE_KEYS: Record<string, string> = {
  // More specific route prefixes must precede their parent routes.
  "/bikes/new": "addBike.title",
  "/bikes": "page.bikes",
  "/service/history": "page.serviceHistory",
  "/service/new": "addService.title",
  "/service": "page.service",
  "/rides": "page.rides",
  "/profile": "page.profile",
  "/settings": "page.settings",
  "/notifications": "page.notifications",
};

// Sub-pages display only a back arrow and title.
const SUB_PAGE_ROUTES: string[] = [
  "/settings",
  "/profile",
  "/notifications",
  "/bikes/new",
  "/service/history",
  "/service/new",
  // This confirmation route owns its screen and action.
  "/strava-connected",
];

// Routes that own the viewport hide all shared application chrome.
const FULL_SCREEN_ROUTES: string[] = ["/strava-connected"];

function isFullScreenRoute(pathname: string): boolean {
  return FULL_SCREEN_ROUTES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

// Detail routes are matched by shape rather than by prefix, so the list they hang under
// is not itself read as a sub-page. Every one of them is a sub-page with its own title.
const DETAIL_ROUTES: { pattern: RegExp; titleKey: string }[] = [
  { pattern: /^\/bikes\/\d+$/, titleKey: "bikes.detailTitle" },
  { pattern: /^\/service\/\d+$/, titleKey: "service.detailTitle" },
];

function detailRoute(pathname: string): { pattern: RegExp; titleKey: string } | undefined {
  return DETAIL_ROUTES.find((route) => route.pattern.test(pathname));
}

function isSubPage(pathname: string): boolean {
  if (detailRoute(pathname)) return true;
  return SUB_PAGE_ROUTES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function getPageTitleKey(pathname: string): string | null {
  const detail = detailRoute(pathname);
  if (detail) return detail.titleKey;
  const match = Object.keys(PAGE_TITLE_KEYS).find((path) => pathname.startsWith(path));
  return match ? PAGE_TITLE_KEYS[match] : null;
}

// Shares active-route matching between the header and tab bar.
function isActivePath(path: string, pathname: string): boolean {
  return path === "/" ? pathname === "/" : pathname.startsWith(path);
}

export function AppLayout(): ReactElement {
  const isOffline = useOfflineWhenCallApiStore((state) => state.isOfflineWhenCallApi);
  const [renderOfflinePage, setRenderOfflinePage] = useState(false);
  const [fabMenuOpened, setFabMenuOpened] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isOnline } = useNetworkStatus();
  // Keeps the resolved route element stable during its exit animation.
  const outlet = useOutlet();
  // Reads the current user cached by the authentication gate.
  const { data: user } = useCurrentUser();
  // Loads unread notifications for the persistent bell badge.
  const { data: unreadNotifications } = useUnreadNotifications();
  const unreadCount = unreadNotifications?.length ?? 0;
  const overrideTitleKey = useHeaderStore((state) => state.titleKey);
  const overrideBack = useHeaderStore((state) => state.onBack);
  // Lets a page suppress shared application chrome.
  const chromeHiddenByPage = useHeaderStore((state) => state.chromeHidden);
  // A step the user cannot walk back out of hides the arrow rather than lying about it.
  const backHidden = useHeaderStore((state) => state.backHidden);
  // Hides chrome when the route or page state requires it.
  const chromeHidden = chromeHiddenByPage || isFullScreenRoute(location.pathname);
  // Home has no header icon.
  const pageTitleKey = overrideTitleKey ?? getPageTitleKey(location.pathname);
  const subPage = isSubPage(location.pathname);

  // Direct entries use the dashboard instead of browser history.
  function goBack(): void {
    // Lets multi-step pages handle their own back navigation.
    if (overrideBack) {
      overrideBack();
      return;
    }
    if (location.key === "default") {
      navigate("/");
      return;
    }
    navigate(-1);
  }

  function handleHardwareBack(): void {
    if (overrideBack) {
      overrideBack();
      return;
    }
    // Backgrounds Android when no in-app history remains.
    if (location.key === "default") {
      void App.minimizeApp();
      return;
    }
    navigate(-1);
  }

  useAndroidBackButton(handleHardwareBack);
  // Listens for Strava callbacks while the app is foregrounded again.
  useStravaDeepLink();

  function headerIcon() {
    // Omits the icon on Home and untitled routes.
    if (pageTitleKey === null) {
      return null;
    }
    const headerIcon = NAV_ITEMS.find((item) => isActivePath(item.path, location.pathname))?.icon_fill;
    if (headerIcon) {
      const HeaderIconComponent = headerIcon;
      return <HeaderIconComponent size={25} />;
    }
    return null;
  }

  return (
    <AppShell
      // Extends header and footer backgrounds into system safe areas.
      header={{
        height: "calc(3.5rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))",
        // Full-screen routes have neither header nor header offset.
        collapsed: chromeHidden,
      }}
      // Collapse the footer offset with the tab bar.
      footer={{ height: "4rem", collapsed: subPage || chromeHidden }}
      bg="background.9"
    >
      {/* --------- HEADER --------- */}
      <AppShell.Header withBorder={false} bg="transparent">
        {/* Keeps title content below the status bar. */}
        <Box
          className="bg-cards-800"
          h="100%"
          px="md"
          style={{
            paddingTop: "var(--safe-area-inset-top, env(safe-area-inset-top, 0px))",
          }}
        >
          <Group h="100%" justify="space-between" w="100%">
            {subPage ? (
              <Group gap="xs" c="text.6">
                {!backHidden && (
                  <ActionIcon variant="transparent" radius="xl" size="lg" aria-label={t("action.back")} onClick={goBack}>
                    <ArrowLeft size={25} color="var(--mantine-color-text-6)" />
                  </ActionIcon>
                )}
                <Text fw={700} size="lg" c="text.6">
                  {pageTitleKey && t(pageTitleKey)}
                </Text>
              </Group>
            ) : (
              <>
                <Group gap="xs" c="cards.1">
                  {/* Decorative icon beside the title. */}
                  {headerIcon()}
                  <Text fw={700} size="lg">
                    {t(pageTitleKey ?? "page.home")}
                  </Text>
                </Group>
                {/* PROFILE ICON */}
                <Group gap="sm">
                  <UnstyledButton onClick={() => navigate("/profile")} aria-label={t("page.profile")} mr="3">
                    {/* name drives the initials fallback when the user has no picture */}
                    <Avatar src={user?.avatar_url} name={user?.name} color="initials" radius="xl" size={32} />
                  </UnstyledButton>
                  {/* NOTIFICATION ICON */}
                  <ActionIcon
                    variant="transparent"
                    radius="sm"
                    size="lg"
                    aria-label={t("page.notifications")}
                    onClick={() => navigate("/notifications")}
                    pos="relative"
                    // style={{ border: "none" }}
                  >
                    <Bell size={25} color="var(--mantine-color-cards-1)" />
                    {/* Displays the unread count, capped at nine plus. */}
                    {unreadCount > 0 && (
                      <Box
                        pos="absolute"
                        top={2}
                        right={0}
                        miw={16}
                        h={16}
                        px={4}
                        style={{
                          borderRadius: "9999px",
                          backgroundColor: "var(--mantine-color-primary-6)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          // Blends the badge border into the header.
                          border: "none",
                        }}
                      >
                        <Text className="font-mono" fz={10} fw={700} c="var(--mantine-color-cards-8)" lh={1}>
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </Text>
                      </Box>
                    )}
                  </ActionIcon>
                  {/* SETTINGS ICON */}
                  <ActionIcon
                    variant="transparent"
                    radius="xl"
                    size="lg"
                    aria-label={t("page.settings")}
                    onClick={() => navigate("/settings")}
                  >
                    <Settings size={25} color="var(--mantine-color-cards-1)" />
                  </ActionIcon>
                </Group>
              </>
            )}
          </Group>
        </Box>
      </AppShell.Header>

      {/* --------- MAIN CONTENT --------- */}
      <AppShell.Main style={{ position: "relative" }}>
        {renderOfflinePage || isOffline ? (
          <OfflinePage />
        ) : (
          // Remounts each route to replay its entry animation.
          <Box key={location.pathname} style={{ animation: "pageEnter 350ms ease-out" }}>
            {outlet}
          </Box>
        )}
        {/* Dims page content without covering shared chrome. */}
        <Box
          onClick={() => setFabMenuOpened(false)}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(1px)",
            opacity: fabMenuOpened ? 1 : 0,
            pointerEvents: fabMenuOpened ? "auto" : "none",
            transition: "opacity 0.2s ease",
            zIndex: 190,
          }}
        />
      </AppShell.Main>

      {/* Hides the create action on sub-pages. */}
      {!subPage && <Fab menuOpened={fabMenuOpened} onMenuOpenedChange={setFabMenuOpened} />}
      {/* --------- FOOTER --------- */}
      {!subPage && (
        <AppShell.Footer
          className="flex justify-center"
          bg="transparent"
          withBorder={false}
          mb="calc(0.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))"
        >
          {/* Fades page content into the fixed safe-area edge. */}
          <Box
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              height: "8rem",
              background: "linear-gradient(to top, rgba(0, 0, 0, 0.90), transparent)",
              pointerEvents: "none",
              zIndex: -1,
            }}
          />
          <Group
            h="110%"
            w="92%"
            grow
            px="xs"
            className="rounded-3xl border border-gray-720 bg-cards-600/30 backdrop-blur-md"
            style={{
              boxShadow: "0 6px 20px color-mix(in srgb, var(--mantine-color-text-6) 15%, transparent)",
            }}
          >
            {NAV_ITEMS.map(({ labelKey, path, icon: Icon, icon_fill: IconFill }) => {
              const active = isActivePath(path, location.pathname);
              // Uses the filled icon for the active tab when available.
              const TabIcon = active ? (IconFill ?? Icon) : Icon;
              return (
                <UnstyledButton
                  key={path}
                  onClick={() => {
                    // Provides feedback for every tab press.
                    tapFeedback();
                    // Avoids duplicate history entries for the active tab.
                    if (location.pathname === path) return;
                    if (!isOnline) setRenderOfflinePage(true);
                    navigate(path);
                  }}
                >
                  <Stack align="center" gap={2}>
                    <div className="relative flex flex-col items-center justify-center w-15 h-8">
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          backgroundColor: active
                            ? "color-mix(in srgb, var(--mantine-color-primary-6) 20%, transparent)"
                            : "transparent",
                          transform: active ? "scaleX(1)" : "scaleX(0)",
                          transition: "transform 0.6s cubic-bezier(0.25, 1.46, 0.45, 0.94)",
                          transformOrigin: "center",
                        }}
                      />
                      <TabIcon
                        size={23}
                        className="relative z-10"
                        color={active ? "var(--mantine-color-primary-5)" : "var(--mantine-color-text-6)"}
                      />
                    </div>
                    <Text size="xs" c={active ? "var(--mantine-color-primary-5)" : "var(--mantine-color-text-5)"}>
                      {t(labelKey)}
                    </Text>
                  </Stack>
                </UnstyledButton>
              );
            })}
          </Group>
        </AppShell.Footer>
      )}
    </AppShell>
  );
}
