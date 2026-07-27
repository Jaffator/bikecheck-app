import { useState, type ReactElement } from "react";
import { AppShell, Box, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bike, Wrench, Settings, Database, type LucideIcon } from "lucide-react";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { OfflinePage } from "@/features/offline_page/OfflinePage";
import { useOfflineWhenCallApiStore } from "@/store/store";

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

// Only sections that actually exist get a tab — add more as their features land.
const NAV_ITEMS: NavItem[] = [
  { label: "Home", path: "/", icon: Database },
  { label: "Garage", path: "/garage", icon: Wrench },
  { label: "Service", path: "/service", icon: Bike },
  { label: "Rides", path: "/rides", icon: Settings },
];

export function AppLayout(): ReactElement {
  const isOffline = useOfflineWhenCallApiStore((state) => state.isOfflineWhenCallApi);
  const [renderOfflinePage, setRenderOfflinePage] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();

  return (
    <AppShell
      // Header/footer are extended by the safe-area insets so their dark
      // background fills the space behind the transparent system bars
      // (edge-to-edge is enforced on Android 15+/targetSdk 35+).
      header={{ height: "calc(3.5rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))" }}
      footer={{ height: "4rem" }}
      bg="background.9"
    >
      <AppShell.Header withBorder={false}>
        {/* paddingTop keeps the title below the status bar while bg fills behind it */}
        <Group
          className="border-b border-gray-900"
          h="100%"
          px="md"
          bg="cards.7"
          style={{ paddingTop: "var(--safe-area-inset-top, env(safe-area-inset-top, 0px))" }}
        >
          <Text fw={700} size="lg" c="primary.6">
            BikeCheck
          </Text>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        {renderOfflinePage || isOffline ? (
          <OfflinePage />
        ) : (
          <div
            key={location.pathname}
            style={{
              animation: "fadeIn 0.3s ease",
            }}
          >
            <Outlet />
          </div>
        )}
      </AppShell.Main>
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
          h="100%"
          w="92%"
          grow
          px="xs"
          className="rounded-3xl border border-gray-800 bg-cards-700/60 backdrop-blur-xs"
          style={{
            boxShadow: "0 6px 20px color-mix(in srgb, var(--mantine-color-text-6) 15%, transparent)",
          }}
        >
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
            const active = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
            return (
              <UnstyledButton
                key={label}
                onClick={() => {
                  if (!isOnline && path != location.pathname) setRenderOfflinePage(true);
                  navigate(path);
                }}
              >
                <Stack align="center" gap={2}>
                  <div className="relative flex flex-col items-center justify-center w-15 h-7">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        backgroundColor: active
                          ? "color-mix(in srgb, var(--mantine-color-primary-6) 10%, transparent)"
                          : "transparent",
                        transform: active ? "scaleX(1)" : "scaleX(0)",
                        transition: "transform 0.6s cubic-bezier(0.25, 1.46, 0.45, 0.94)",
                        transformOrigin: "center",
                      }}
                    />
                    <Icon
                      size={18}
                      className="relative z-10"
                      color={active ? "var(--mantine-color-primary-5)" : "var(--mantine-color-text-6)"}
                    />
                  </div>
                  <Text size="xs" c="text.6">
                    {label}
                  </Text>
                </Stack>
              </UnstyledButton>
            );
          })}
        </Group>
      </AppShell.Footer>
    </AppShell>
  );
}
