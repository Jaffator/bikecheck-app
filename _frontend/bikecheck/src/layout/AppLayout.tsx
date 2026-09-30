import { useState, type CSSProperties, type ReactElement } from "react";
import { ActionIcon, AppShell, Avatar, Box, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useLocation, useNavigate, useOutlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, ArrowLeft } from "lucide-react";
import Logo from "@/assets/icons/bikecheck/Logo_white.svg?react";
import { App } from "@capacitor/app";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";
import { useStravaDeepLink } from "@/hooks/useStravaDeepLink";
import { useResumeRefresh } from "@/hooks/useResumeRefresh";
import { OfflinePage } from "@/features/offline_page/OfflinePage";
import { useOfflineWhenCallApiStore, useHeaderStore, useOverlayStore } from "@/store/store";
import { useCurrentUser } from "@/features/users/users.queries";
import { useUnreadNotifications } from "@/features/notifications/notifications.queries";
import { useMyProfile } from "@/features/profile/profile.queries";
import { CheckInPromptDrawer } from "@/features/rides/ui/CheckInPromptDrawer";
import { tapFeedback } from "@/utils/haptics";
import { Fab } from "./Fab";
import { MoreDrawer } from "./MoreDrawer";
import { Sidebar } from "./Sidebar";
import { HeaderCountBadge } from "./HeaderCountBadge";
import { TRANSPARENT_HEADER_CONTROL } from "./headerControl";
import { BAR_WIDTH, CONTENT_MAX_WIDTH, SIDEBAR_WIDTH, WIDE_CONTENT_MAX_WIDTH, isWideRoute } from "./contentWidth";
import { useIsDesktop } from "./breakpoints";
import { NAV_ITEMS, TAB_STROKE, TAB_STROKE_ACTIVE, isActivePath } from "./navItems";

// The mark Home wears instead of a title. Its width follows from the artwork's ratio, and it
// is nudged in because the artwork carries no padding of its own, unlike the tab icons.
const LOGO_HEIGHT = 20;
const LOGO_INSET = 8;

// The tab's mark beside the page title. Two points over the title's own 18px, so it leads the
// pair without shouting over it.
const TITLE_ICON_SIZE = 20;

// The overviews share one large page title on desktop, as a web app's pages do.
const DESKTOP_TITLE_SIZE = 28;

// Maps routes to translated header titles; Home intentionally has none.
const PAGE_TITLE_KEYS: Record<string, string> = {
  // More specific route prefixes must precede their parent routes.
  "/bikes/new": "addBike.title",
  "/bikes": "page.bikes",
  "/service/history": "page.serviceHistory",
  "/service/new": "addService.title",
  "/service": "page.service",
  "/reports": "page.reports",
  "/follows": "page.follows",
  "/rides": "page.rides",
  "/chat": "page.chat",
  "/settings": "page.settings",
  "/notifications": "page.notifications",
};

// Sub-pages display only a back arrow and title.
const SUB_PAGE_ROUTES: string[] = [
  "/reports",
  "/follows",
  "/chat",
  "/settings",
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
  // The edit form is matched first: it is a longer shape than the detail it hangs under.
  { pattern: /^\/bikes\/\d+\/edit$/, titleKey: "bikeEdit.title" },
  // The Setup screen names the bike in its header; this title is the fallback while it loads.
  { pattern: /^\/bikes\/\d+\/setup$/, titleKey: "setup.title" },
  // One bike's history wears the same title as the garage's; the card below names the bike.
  { pattern: /^\/bikes\/\d+\/history$/, titleKey: "page.serviceHistory" },
  { pattern: /^\/bikes\/\d+$/, titleKey: "bikes.detailTitle" },
  // Somebody's garage and one of their bikes; the bike page names its owner once it lands.
  { pattern: /^\/users\/[^/]+$/, titleKey: "sharing.profileTitle" },
  { pattern: /^\/users\/[^/]+\/\d+$/, titleKey: "sharing.profileTitle" },
];

function detailRoute(pathname: string): { pattern: RegExp; titleKey: string } | undefined {
  return DETAIL_ROUTES.find((route) => route.pattern.test(pathname));
}

// A sidebar row on desktop, so the page gets the top-level title and no back arrow.
const DESKTOP_TOP_LEVEL_ROUTES: string[] = ["/notifications"];

function isSubPage(pathname: string, isDesktop: boolean): boolean {
  if (isDesktop && DESKTOP_TOP_LEVEL_ROUTES.includes(pathname)) return false;
  if (detailRoute(pathname)) return true;
  return SUB_PAGE_ROUTES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function getPageTitleKey(pathname: string): string | null {
  const detail = detailRoute(pathname);
  if (detail) return detail.titleKey;
  const match = Object.keys(PAGE_TITLE_KEYS).find((path) => pathname.startsWith(path));
  return match ? PAGE_TITLE_KEYS[match] : null;
}

// TEMPORARY: swapping the routed subtree for the offline page unmounts whatever the user
// was in the middle of - the add-service wizard loses every step and lands back on the bike
// choice. Off while we work out whether that swap is what resets the wizard during an
// attachment upload. Flip back to true to restore the offline screen.
const OFFLINE_PAGE_ENABLED = false;

export function AppLayout(): ReactElement {
  const isOffline = useOfflineWhenCallApiStore((state) => state.isOfflineWhenCallApi);
  const [renderOfflinePage, setRenderOfflinePage] = useState(false);
  const [fabMenuOpened, setFabMenuOpened] = useState(false);
  const [moreOpened, setMoreOpened] = useState(false);
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
  // Pending follow requests sit on the More tab, not the bell: a request is a task that
  // clears when answered, not something read (#155, #158).
  const { data: profile } = useMyProfile();
  const pendingRequests = profile?.stats.pending_requests ?? 0;
  const overrideTitleKey = useHeaderStore((state) => state.titleKey);
  // A title a translation key cannot express - a category the user named, with its icon.
  const overrideTitleSlot = useHeaderStore((state) => state.titleSlot);
  const overrideBack = useHeaderStore((state) => state.onBack);
  const closeTopOverlay = useOverlayStore((state) => state.closeTopOverlay);
  // Lets a page suppress shared application chrome.
  const chromeHiddenByPage = useHeaderStore((state) => state.chromeHidden);
  // A step the user cannot walk back out of hides the arrow rather than lying about it.
  const backHidden = useHeaderStore((state) => state.backHidden);
  const actionSlot = useHeaderStore((state) => state.actionSlot);
  // A page leading with an image runs its content up under the header - see the store.
  const headerTransparent = useHeaderStore((state) => state.headerTransparent);
  const isDesktop = useIsDesktop();
  const fullScreen = isFullScreenRoute(location.pathname);
  // Hides chrome when the route or page state requires it. On desktop that is the header
  // alone: the sidebar leaves only with a full-screen route.
  const chromeHidden = chromeHiddenByPage || fullScreen;
  const subPage = isSubPage(location.pathname, isDesktop);
  // Home wears the logo instead of a title; on desktop the sidebar wears it, so Home is named.
  const pageTitleKey =
    overrideTitleKey ?? getPageTitleKey(location.pathname) ?? (isDesktop && !subPage ? "page.home" : null);
  // Both widths are the phone's column below the breakpoint.
  const contentWidth = isDesktop && isWideRoute(location.pathname) ? WIDE_CONTENT_MAX_WIDTH : CONTENT_MAX_WIDTH;

  // The FAB menu and the More sheet have no trigger on desktop, so crossing into it shuts them.
  if (isDesktop && (fabMenuOpened || moreOpened)) {
    setFabMenuOpened(false);
    setMoreOpened(false);
  }

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
    // A sheet standing over the page is what the gesture means, so it goes first and the
    // route stays where it is.
    if (closeTopOverlay()) return;
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
  // Rides land while the app is away; coming back re-reads what they move.
  useResumeRefresh();

  function headerIcon() {
    // Omits the icon on Home and untitled routes.
    if (pageTitleKey === null) {
      return null;
    }
    const item = NAV_ITEMS.find((entry) => entry.path !== null && isActivePath(entry.path, location.pathname));
    if (!item) return null;
    const HeaderIconComponent = item.icon_fill ?? item.icon;
    return <HeaderIconComponent size={TITLE_ICON_SIZE} strokeWidth={item.icon_fill ? undefined : TAB_STROKE_ACTIVE} />;
  }

  return (
    <AppShell
      // The sidebar runs the full height; the header sits beside it.
      layout="alt"
      // Extends header and footer backgrounds into system safe areas.
      header={{
        height: "calc(3rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))",
        // Full-screen routes have neither header nor header offset. A transparent header
        // keeps its controls but stops reserving its height, so content passes beneath it.
        collapsed: chromeHidden,
        offset: !headerTransparent,
      }}
      navbar={{ width: SIDEBAR_WIDTH, breakpoint: "md", collapsed: { mobile: true, desktop: fullScreen } }}
      // Collapse the footer offset with the tab bar.
      footer={{ height: "4rem", collapsed: subPage || chromeHidden || isDesktop }}
      bg="background.9"
    >
      {isDesktop && !fullScreen && <Sidebar />}

      {/* --------- HEADER --------- */}
      <AppShell.Header withBorder={false} bg="transparent">
        {/* Keeps title content below the status bar. */}
        <Box
          h="100%"
          style={{
            paddingTop: "var(--safe-area-inset-top, env(safe-area-inset-top, 0px))",
            // Nothing sits behind the controls now, so they are given their own shade to
            // stand on - enough to read a dark arrow against a bright photo.
            backgroundImage: headerTransparent
              ? "linear-gradient(to bottom, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.3) 45%, transparent 100%)"
              : undefined,
            // The page colour carried up over the status bar, so the bar reads as the top of
            // the page rather than as a shelf above it.
            backgroundColor: headerTransparent ? undefined : "var(--mantine-color-background-9)",
            // The scrim is decoration; what is underneath stays reachable.
            pointerEvents: headerTransparent ? "none" : undefined,
          }}
        >
          <Group
            h="100%"
            justify="space-between"
            w="100%"
            maw={contentWidth}
            mx="auto"
            // Padding inside the column, like the pages', so the title lines up with their edge.
            px="md"
            style={{ pointerEvents: "auto" }}
          >
            {subPage ? (
              <>
                <Group gap="xs" c="text.6" wrap="nowrap" style={{ minWidth: 0 }}>
                  {!backHidden && (
                    <ActionIcon
                      variant="transparent"
                      radius="xl"
                      size="lg"
                      aria-label={t("action.back")}
                      onClick={goBack}
                      style={headerTransparent ? TRANSPARENT_HEADER_CONTROL : undefined}
                    >
                      <ArrowLeft size={25} color="var(--mantine-color-text-6)" />
                    </ActionIcon>
                  )}
                  {overrideTitleSlot ?? (
                    <Text
                      fw={600}
                      size="lg"
                      c="text.6"
                      px={headerTransparent ? 10 : undefined}
                      py={headerTransparent ? 2 : undefined}
                      style={headerTransparent ? { ...TRANSPARENT_HEADER_CONTROL, borderRadius: "9999px" } : undefined}
                    >
                      {pageTitleKey && t(pageTitleKey)}
                    </Text>
                  )}
                </Group>
                {/* Whatever the page hung here; nothing renders when it hung nothing. */}
                {actionSlot}
              </>
            ) : (
              <>
                {pageTitleKey === null ? (
                  // Home has no title of its own, so the app's mark stands where one would be.
                  <Logo style={{ height: LOGO_HEIGHT, width: "auto", marginLeft: LOGO_INSET }} />
                ) : (
                  <Group gap="xs" c="cards.1">
                    {/* Decorative icon beside the title; on desktop the sidebar row already shows it. */}
                    {!isDesktop && headerIcon()}
                    <Text fw={isDesktop ? 700 : 600} size="lg" fz={isDesktop ? DESKTOP_TITLE_SIZE : undefined}>
                      {t(pageTitleKey)}
                    </Text>
                  </Group>
                )}
                {/* Least used furthest from the thumb: the bell, then the rider in the corner
                    the thumb owns. People moved to the More tab (#158). */}
                <Group gap="sm">
                  {/* Whatever the tab hung here, before the icons; nothing renders when it hung nothing. */}
                  {actionSlot}
                  {/* On desktop both live at the sidebar's foot. */}
                  {!isDesktop && (
                    <>
                      {/* NOTIFICATION ICON */}
                      <ActionIcon
                        variant="transparent"
                        radius="sm"
                        size="lg"
                        aria-label={t("page.notifications")}
                        onClick={() => navigate("/notifications")}
                        pos="relative"
                      >
                        <Bell size={25} color="var(--mantine-color-cards-1)" />
                        <HeaderCountBadge count={unreadCount} />
                      </ActionIcon>
                      <UnstyledButton onClick={() => navigate("/settings")} aria-label={t("page.settings")}>
                        {/* name drives the initials fallback when the user has no picture */}
                        <Avatar
                          src={user?.avatar_url}
                          name={user?.name}
                          radius="xl"
                          size={32}
                          style={
                            {
                              "--avatar-bg": "var(--mantine-color-cards-5)",
                              "--avatar-color": "var(--mantine-color-text-6)",
                            } as CSSProperties
                          }
                        />
                      </UnstyledButton>
                    </>
                  )}
                </Group>
              </>
            )}
          </Group>
        </Box>
      </AppShell.Header>

      {/* --------- MAIN CONTENT --------- */}
      <AppShell.Main style={{ position: "relative" }}>
        {OFFLINE_PAGE_ENABLED && (renderOfflinePage || isOffline) ? (
          <OfflinePage />
        ) : (
          // Remounts each route to replay its entry animation. The column is the page's
          // width in a browser; on a phone it is the phone.
          <Box key={location.pathname} maw={contentWidth} mx="auto" style={{ animation: "pageEnter 350ms ease-out" }}>
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

      {/* Hides the create action on sub-pages. The FAB, More and the tab bar are the phone's;
          the sidebar holds all three on desktop. */}
      {!subPage && !isDesktop && <Fab menuOpened={fabMenuOpened} onMenuOpenedChange={setFabMenuOpened} />}
      {!isDesktop && <MoreDrawer opened={moreOpened} onClose={() => setMoreOpened(false)} />}
      {/* Desktop asks on Home's Last ride panel instead of popping anything up. */}
      {!isDesktop && <CheckInPromptDrawer />}
      {/* --------- FOOTER --------- */}
      {!subPage && !isDesktop && (
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
            w={BAR_WIDTH}
            grow
            px="xs"
            className="rounded-3xl border border-gray-720 bg-cards-600/30 backdrop-blur-md"
            style={{
              boxShadow: "0 6px 20px color-mix(in srgb, var(--mantine-color-text-6) 15%, transparent)",
            }}
          >
            {NAV_ITEMS.map(({ labelKey, path, icon: Icon, icon_fill: IconFill }) => {
              // The More tab stands for a sheet rather than a route, so it reads as active
              // while the sheet is open.
              const isMore = path === null;
              const active = isMore ? moreOpened : isActivePath(path, location.pathname);
              // Uses the filled icon for the active tab when available.
              const TabIcon = active ? (IconFill ?? Icon) : Icon;
              return (
                <UnstyledButton
                  key={labelKey}
                  onClick={() => {
                    // Provides feedback for every tab press.
                    tapFeedback();
                    if (isMore) {
                      setMoreOpened(true);
                      return;
                    }
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
                        // Ignored by the app's own marks, which carry their weight in the fill.
                        strokeWidth={active ? TAB_STROKE_ACTIVE : TAB_STROKE}
                      />
                      {/* A dot, not a figure: the sheet will hold more than requests in time
                          and a number on the tab would have to say what it counts (#158). */}
                      {isMore && pendingRequests > 0 && (
                        <Box
                          pos="absolute"
                          top={0}
                          right={10}
                          w={7}
                          h={7}
                          className="z-10"
                          // Silent to a screen reader otherwise: a dot carries no text of its own.
                          role="status"
                          aria-label={t("follow.requestsTitle")}
                          style={{ borderRadius: "9999px", backgroundColor: "var(--mantine-color-primary-6)" }}
                        />
                      )}
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
