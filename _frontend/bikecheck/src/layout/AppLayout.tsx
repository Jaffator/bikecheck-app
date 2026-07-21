import type { ReactElement } from "react";
import { AppShell, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bike, Wrench, type LucideIcon } from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

// Only sections that actually exist get a tab — add more as their features land.
const NAV_ITEMS: NavItem[] = [
  { label: "pokus", path: "/", icon: Bike },
  { label: "hovno", path: "/hovno", icon: Wrench },
];

export function AppLayout(): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <AppShell
      // Header/footer are extended by the safe-area insets so their dark
      // background fills the space behind the transparent system bars
      // (edge-to-edge is enforced on Android 15+/targetSdk 35+).
      header={{ height: "calc(3.5rem + env(safe-area-inset-top))" }}
      footer={{ height: "calc(4rem + env(safe-area-inset-bottom))" }}
      padding="md"
    >
      <AppShell.Header>
        {/* paddingTop keeps the title below the status bar while bg fills behind it */}
        <Group h="100%" px="md" bg="inputs.6" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <Text fw={700} size="lg" c="primary.6">
            BikeCheck
          </Text>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer>
        {/* paddingBottom keeps the tabs above the gesture bar while bg fills behind it */}
        <Group h="100%" grow px="xs" bg="inputs.6" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
            const active = location.pathname.startsWith(path);
            return (
              <UnstyledButton key={label} onClick={() => navigate(path)}>
                <Stack align="center" gap={2}>
                  <Icon size={22} color={active ? "var(--mantine-color-primary-6)" : "var(--mantine-color-text-7)"} />
                  <Text size="xs" c={active ? "primary.6" : "dimmed"}>
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
