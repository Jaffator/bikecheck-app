// The account: who the rider is, what they are linked to, and the way out. What the app
// does is set next door in Settings; this page is only about them.
import { useState, type CSSProperties, type ReactElement } from "react";
import { Avatar, Button, Card, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { ChevronRight, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StravaStatusCard } from "@/features/strava/ui/StravaStatusCard";
import { useCurrentUser, useLogout } from "@/features/users/users.queries";
import { ProfileEditDrawer } from "./ProfileEditDrawer";

export function Profile(): ReactElement | null {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const [editing, setEditing] = useState(false);
  // The page dims before the session is dropped, so the login screen is not swapped in
  // under a fully lit page.
  const [leaving, setLeaving] = useState(false);

  // The auth gate has already loaded the user; there is nothing to show without one.
  if (!user) return null;

  function signOut(): void {
    setLeaving(true);
    // Long enough for the fade to read, short enough not to feel like waiting.
    window.setTimeout(() => logout.mutate(), 200);
  }

  return (
    // Tall enough to reach the bottom of the screen, so the way out sits at the foot of the
    // page rather than under the last card.
    <Stack
      gap={0}
      mih="calc(100dvh - var(--app-shell-header-offset, 0px))"
      style={{ opacity: leaving ? 0 : 1, transition: "opacity 220ms ease-out" }}
    >
      {/* Not a card: this names the rider, it does not set anything. */}
      <Stack align="center" gap={6} pt="lg" pb="md" px="md">
        <Avatar
          src={user.avatar_url}
          name={user.name}
          radius="xl"
          size={80}
          style={
            {
              "--avatar-bg": "color-mix(in srgb, var(--mantine-color-primary-5) 50%, transparent)",
              "--avatar-color": "var(--mantine-color-primary-3)",
            } as CSSProperties
          }
        />
        <Text fw={700} fz={20} c="text.6" ta="center" style={{ lineHeight: 1.25, letterSpacing: "-0.016em" }}>
          {user.name}
        </Text>
        <Text size="sm" c="var(--color-text-dim)" ta="center" style={{ lineHeight: 1.45 }}>
          {user.email}
        </Text>
      </Stack>

      {/* Name and weight are one form, so both rows open the same drawer. */}
      <Card bg="cards.6" className="m-3" p={0} radius="lg" style={{ border: "1px solid var(--mantine-color-inputs-5)" }}>
        <UnstyledButton onClick={() => setEditing(true)} className="w-full" p="md">
          <Group justify="space-between" wrap="nowrap">
            <Text fw={600} fz={15} c="text.6">
              {t("profile.name")}
            </Text>
            <Group gap="xs" wrap="nowrap">
              <Text fz={13} c="var(--color-text-dim)" truncate>
                {user.name}
              </Text>
              <ChevronRight size={18} color="var(--color-text-dim)" />
            </Group>
          </Group>
        </UnstyledButton>
        <UnstyledButton onClick={() => setEditing(true)} className="w-full" p="md" pt={0}>
          <Group justify="space-between" wrap="nowrap">
            <Text fw={600} fz={15} c="text.6">
              {t("profile.weight")}
            </Text>
            <Group gap="xs" wrap="nowrap">
              {/* A figure, so the mono face - and never a zero standing in for no answer. */}
              {user.weight_kg === null ? (
                <Text fz={13} c="var(--color-text-dim)">
                  {t("profile.weightEmpty")}
                </Text>
              ) : (
                <Text className="font-mono" fz={13} c="var(--color-text-dim)" style={{ letterSpacing: "0.02em" }}>
                  {`${String(user.weight_kg)} kg`}
                </Text>
              )}
              <ChevronRight size={18} color="var(--color-text-dim)" />
            </Group>
          </Group>
        </UnstyledButton>
      </Card>

      {/* The linked account lives with the identity it belongs to, connected or not. */}
      <div className="m-3">
        <StravaStatusCard allowDisconnect />
      </div>

      {/* Nothing is lost by logging out, so it asks nothing before it does - and it is not
          why anyone opened this page, so it stays quiet at the foot of it. */}
      <Group
        justify="center"
        mt="auto"
        pt="xl"
        pb="calc(1.5rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))"
      >
        <Button
          variant="transparent"
          size="compact-sm"
          c="var(--color-text-dim)"
          leftSection={<LogOut size={16} />}
          loading={logout.isPending || leaving}
          onClick={signOut}
          className="transition-opacity active:opacity-60"
          styles={{ label: { fontSize: 15, fontWeight: 500 } }}
        >
          {t("profile.logout")}
        </Button>
      </Group>

      <ProfileEditDrawer user={user} opened={editing} onClose={() => setEditing(false)} />
    </Stack>
  );
}
