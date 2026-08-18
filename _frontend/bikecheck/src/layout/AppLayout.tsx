import { useState, type ReactElement } from "react";
import { ActionIcon, AppShell, Avatar, Box, Group, Stack, Text, UnstyledButton, Image } from "@mantine/core";
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
import { OfflinePage } from "@/features/offline_page/OfflinePage";
import { useOfflineWhenCallApiStore, useHeaderStore } from "@/store/store";
import { useCurrentUser } from "@/features/users/users.queries";
import { tapFeedback } from "@/utils/haptics";
import { Fab } from "./Fab";
import { PageTransition } from "./PageTransition";
import logo_mark from "@/assets/icons/bikecheck/onlylogo.svg";
// import { bikecheckIconType } from "@/assets/icons/bikecheck";

interface NavItem {
  labelKey: string;
  path: string;
  icon: IconType;
  icon_fill?: IconType;
}

// Only sections that actually exist get a tab — add more as their features land.
// Paths, not labels, identify a section — labels are translated at render time.
const NAV_ITEMS: NavItem[] = [
  { labelKey: "nav.home", path: "/", icon: GoHome, icon_fill: GoHomeFill },
  { labelKey: "nav.bikes", path: "/bikes", icon: PiPersonSimpleBike, icon_fill: PiPersonSimpleBikeBold },
  {
    labelKey: "nav.service",
    path: "/service",
    // Own outline icon, falling back to the react-icons one if it is ever renamed.
    icon: RiWrenchLine,
    icon_fill: RiWrenchFill,
  },
  { labelKey: "nav.rides", path: "/rides", icon: PiPath, icon_fill: PiPathBold },
];

// Header title per section. Home is absent on purpose — it shows the logo mark
// instead of the tab icon.
const PAGE_TITLE_KEYS: Record<string, string> = {
  // More specific paths first — getPageTitleKey takes the first prefix match,
  // so "/bikes/new" would otherwise resolve to the "/bikes" entry.
  "/bikes/new": "addBike.title",
  "/bikes": "page.bikes",
  "/service": "page.service",
  "/rides": "page.rides",
  "/profile": "page.profile",
  "/settings": "page.settings",
  "/notifications": "page.notifications",
};

// Sub-pages drop the tab bar and the header actions — just a back arrow and the title.
const SUB_PAGE_ROUTES: string[] = ["/settings", "/profile", "/notifications", "/bikes/new"];

// One bike opened from the garage. Not a prefix in SUB_PAGE_ROUTES, because
// "/bikes" would then make the garage list itself a sub-page.
const BIKE_DETAIL_PATTERN = /^\/bikes\/\d+$/;

function isSubPage(pathname: string): boolean {
  if (BIKE_DETAIL_PATTERN.test(pathname)) return true;
  return SUB_PAGE_ROUTES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function getPageTitleKey(pathname: string): string | null {
  if (BIKE_DETAIL_PATTERN.test(pathname)) return "bikes.detailTitle";
  const match = Object.keys(PAGE_TITLE_KEYS).find((path) => pathname.startsWith(path));
  return match ? PAGE_TITLE_KEYS[match] : null;
}

// Shared by the header icon and the tab bar so both stay on the same rule.
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
  // The resolved element for the current route, not a <Outlet /> placeholder —
  // a placeholder re-reads the router on every render, so the page being
  // animated away would render as the page that replaced it.
  const outlet = useOutlet();
  // Already cached by the auth gate in App.tsx, so this is a read, not a fetch.
  const { data: user } = useCurrentUser();
  // Set by a page that needs header chrome the route map cannot express.
  const overrideTitleKey = useHeaderStore((state) => state.titleKey);
  const overrideBack = useHeaderStore((state) => state.onBack);
  // A full-screen page (the add-bike confirmation) hides the app chrome entirely.
  const chromeHidden = useHeaderStore((state) => state.chromeHidden);
  // null on Home, which gets the logo mark instead of a tab icon.
  const pageTitleKey = overrideTitleKey ?? getPageTitleKey(location.pathname);
  const subPage = isSubPage(location.pathname);

  // location.key is "default" only on the first history entry, i.e. a direct
  // landing (refresh, deep link) — going back there would leave the app.
  function goBack(): void {
    // A page with internal steps handles its own back, one level at a time.
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
    // "default" is the first history entry — nothing left to go back to in-app,
    // so background the app the way Android 12+ does instead of killing it.
    if (location.key === "default") {
      void App.minimizeApp();
      return;
    }
    navigate(-1);
  }

  useAndroidBackButton(handleHardwareBack);

  function headerIcon() {
    // Home and anything outside PAGE_TITLE_KEYS show the logo, not a tab icon.
    if (pageTitleKey === null) {
      return <Image src={logo_mark} alt="BikeCheck" w={25} fit="contain" />;
    }
    const headerIcon = NAV_ITEMS.find((item) => isActivePath(item.path, location.pathname))?.icon_fill;
    if (headerIcon) {
      const HeaderIconComponent = headerIcon;
      return <HeaderIconComponent size={22} />;
    }
    return null;
  }

  return (
    <AppShell
      // Header/footer are extended by the safe-area insets so their dark
      // background fills the space behind the transparent system bars
      // (edge-to-edge is enforced on Android 15+/targetSdk 35+).
      header={{
        height: "calc(3.5rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))",
        // A page that owns the whole screen gets no title bar, and no offset for
        // one either.
        collapsed: chromeHidden,
      }}
      // collapsed also drops the Main bottom offset the tab bar would need
      footer={{ height: "4rem", collapsed: subPage || chromeHidden }}
      bg="background.9"
    >
      {/* ----------- Header ----------- */}
      <AppShell.Header withBorder={false} bg="transparent">
        {/* paddingTop keeps the title below the status bar while bg fills behind it.
            The bar itself stays put — only its contents travel with the page. */}
        <Box
          className="bg-cards-700"
          h="100%"
          px="md"
          style={{
            paddingTop: "var(--safe-area-inset-top, env(safe-area-inset-top, 0px))",
          }}
        >
          <PageTransition
            pathname={location.pathname}
            isSubPage={subPage}
            fillHeight
            surface="var(--mantine-color-cards-7)"
          >
            <Group h="100%" justify="space-between" w="100%">
              {subPage ? (
                <Group gap="xs" c="text.6">
                  <ActionIcon variant="transparent" radius="xl" size="lg" aria-label={t("action.back")} onClick={goBack}>
                    <ArrowLeft size={25} color="var(--mantine-color-text-6)" />
                  </ActionIcon>
                  <Text fw={700} size="lg" c="text.6">
                    {pageTitleKey && t(pageTitleKey)}
                  </Text>
                </Group>
              ) : (
                <>
                  <Group gap="xs" c="text.6">
                    {/* Decorative next to the title, so no alt text. */}
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
                      radius="xl"
                      size="lg"
                      aria-label={t("page.notifications")}
                      onClick={() => navigate("/notifications")}
                    >
                      <Bell size={25} color="var(--mantine-color-text-6)" />
                    </ActionIcon>
                    {/* SETTINGS ICON */}
                    <ActionIcon
                      variant="transparent"
                      radius="xl"
                      size="lg"
                      aria-label={t("page.settings")}
                      onClick={() => navigate("/settings")}
                    >
                      <Settings size={25} color="var(--mantine-color-text-6)" />
                    </ActionIcon>
                  </Group>
                </>
              )}
            </Group>
          </PageTransition>
        </Box>
      </AppShell.Header>

      {/* ----------- Main Content ----------- */}
      <AppShell.Main style={{ position: "relative" }}>
        {renderOfflinePage || isOffline ? (
          <OfflinePage />
        ) : (
          <PageTransition pathname={location.pathname} isSubPage={subPage}>
            {outlet}
          </PageTransition>
        )}
        {/* Dims only the page content behind the Fab dropdown — Mantine's own
            Menu overlay portals to the viewport and would cover the header,
            footer and Fab too. */}
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
      {/* Hidden on sub-pages, which drop the chrome entirely. */}
      {!subPage && <Fab menuOpened={fabMenuOpened} onMenuOpenedChange={setFabMenuOpened} />}
      {/* ----------- Footer -----------  */}
      {!subPage && (
        <AppShell.Footer
          className="flex justify-center"
          bg="transparent"
          withBorder={false}
          mb="calc(0.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))"
        >
          {/* Fades page content into the safe-area edge behind the floating pill.
            position: fixed anchors it to the physical viewport bottom, independent
            of the footer's own margin-shifted box. */}
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
            className="rounded-3xl border border-gray-800 bg-cards-700/60 backdrop-blur-xs"
            style={{
              boxShadow: "0 6px 20px color-mix(in srgb, var(--mantine-color-text-6) 15%, transparent)",
            }}
          >
            {NAV_ITEMS.map(({ labelKey, path, icon: Icon, icon_fill: IconFill }) => {
              const active = isActivePath(path, location.pathname);
              // Filled variant marks the active tab; tabs without one keep the outline.
              const TabIcon = active ? (IconFill ?? Icon) : Icon;
              return (
                <UnstyledButton
                  key={path}
                  onClick={() => {
                    // Fires on every press, including the active tab — the tap itself
                    // is what gets the feedback, not the navigation.
                    tapFeedback();
                    // Re-tapping the current tab would only stack duplicate history entries.
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
