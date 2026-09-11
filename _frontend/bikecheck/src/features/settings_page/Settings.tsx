// Settings page: who the rider is and what the app does for them, one page deep. The header
// avatar is the only door to it, so the account opens the page and the way out closes it.
import { useState, type CSSProperties, type ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Card, Group, SegmentedControl, Stack, Switch, Text, UnstyledButton } from "@mantine/core";
import { ChevronRight, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StravaStatusCard } from "@/features/strava/ui/StravaStatusCard";
import { useCurrentUser, useLogout, useUpdateUser } from "@/features/users/users.queries";
import { SUPPORTED_LANGUAGES, applyLanguage } from "@/i18n";
import { FALLBACK_CURRENCY, SUPPORTED_CURRENCIES } from "@/utils/money";
import { CustomPartsDrawer } from "./CustomPartsDrawer";
import { BikeArchiveDrawer } from "./BikeArchiveDrawer";
import { ChangePasswordDrawer } from "./ChangePasswordDrawer";
import { DeleteAccountDrawer } from "./DeleteAccountDrawer";
import { ProfileEditDrawer } from "./ProfileEditDrawer";

// Darker than Mantine's light-scheme default, to sit on the dark card without glowing.
const SEGMENTED_CONTROL_STYLES = {
  root: { backgroundColor: "var(--mantine-color-inputs-6)" },
  indicator: { backgroundColor: "var(--mantine-color-cards-5)" },
  label: { color: "var(--color-text-dim)" },
} as const;

export function Settings(): ReactElement | null {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const updateUser = useUpdateUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const [customParts, setCustomParts] = useState(false);
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  // The page dims before the session is dropped, so the login screen is not swapped in under
  // a fully lit page.
  const [leaving, setLeaving] = useState(false);
  // The empty garage links straight into the archive, so it arrives already open.
  const location = useLocation();
  const [archive, setArchive] = useState((location.state as { openArchive?: boolean } | null)?.openArchive === true);

  // Update the UI before persisting the language.
  function changeLanguage(language: string): void {
    void applyLanguage(language);
    if (user) {
      updateUser.mutate({ id: user.id, data: { language } });
    }
  }

  // The currency only names the figures; nothing is converted, because the app knows no
  // rate. Switching it relabels what is already recorded.
  function changeCurrency(currency: string): void {
    if (user) {
      updateUser.mutate({ id: user.id, data: { currency } });
    }
  }

  // Mutes push only. The bell keeps counting, so nothing is lost - just not interrupted.
  function changeNotifications(enabled: boolean): void {
    if (user) {
      updateUser.mutate({ id: user.id, data: { notifications_enabled: enabled } });
    }
  }

  function signOut(): void {
    setLeaving(true);
    // Long enough for the fade to read, short enough not to feel like waiting.
    window.setTimeout(() => logout.mutate(), 200);
  }

  // Null is a user who never touched the switch, which the backend reads as on.
  const notificationsEnabled = user?.notifications_enabled !== false;

  // The auth gate has already loaded the user; there is nothing to set without one.
  if (!user) return null;

  return (
    <Stack gap={0} style={{ opacity: leaving ? 0 : 1, transition: "opacity 220ms ease-out" }}>
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

      <Text className="font-mono" fz={11} fw={400} tt="uppercase" lts="0.08em" c="var(--color-text-dim)" px="md">
        {t("settings.sectionAccount")}
      </Text>
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

        {/* Only for an account that has a password. A Google rider sets none, so offering the
            row would suggest they have one to change. */}
        {user.has_password && (
          <UnstyledButton onClick={() => setChangingPassword(true)} className="w-full" p="md" pt={0}>
            <Group justify="space-between" wrap="nowrap">
              <Text fw={600} fz={15} c="text.6">
                {t("profile.changePassword")}
              </Text>
              <ChevronRight size={18} color="var(--color-text-dim)" />
            </Group>
          </UnstyledButton>
        )}
      </Card>

      {/* The linked account lives with the identity it belongs to, connected or not. */}
      <div className="m-3">
        <StravaStatusCard allowDisconnect />
      </div>

      <Text className="font-mono" fz={11} fw={400} tt="uppercase" lts="0.08em" c="var(--color-text-dim)" px="md">
        {t("settings.sectionBikes")}
      </Text>
      <Card bg="cards.6" className="m-3" p={0} radius="lg" style={{ border: "1px solid var(--mantine-color-inputs-5)" }}>
        <Stack gap={0}>
          {/* The parts the owner named themselves. A list rather than a setting, so it opens
              over the page instead of resolving in place. */}
          <UnstyledButton onClick={() => setCustomParts(true)} className="w-full" p="md">
            <Group justify="space-between" wrap="nowrap">
              <Text c="text.6" fz={15} fw={600}>
                {t("settings.customParts")}
              </Text>
              <ChevronRight size={18} color="var(--color-text-dim)" />
            </Group>
          </UnstyledButton>

          {/* The bikes taken out of use. A list rather than a setting, so it opens over the
              page the way the custom parts do - and it is the only door to the archive. */}
          <UnstyledButton onClick={() => setArchive(true)} className="w-full" p="md">
            <Group justify="space-between" wrap="nowrap">
              <Text c="text.6" fz={15} fw={600}>
                {t("settings.bikeArchive")}
              </Text>
              <ChevronRight size={18} color="var(--color-text-dim)" />
            </Group>
          </UnstyledButton>
        </Stack>
      </Card>

      <Text className="font-mono" fz={11} fw={400} tt="uppercase" lts="0.08em" c="var(--color-text-dim)" px="md">
        {t("settings.sectionGeneral")}
      </Text>
      <Card bg="cards.6" className="m-3" p={0} radius="lg" style={{ border: "1px solid var(--mantine-color-inputs-5)" }}>
        <Stack gap={0}>
          <Group justify="space-between" p="md">
            <Text c="text.6" fz={15} fw={600}>
              {t("settings.language")}
            </Text>
            <SegmentedControl
              value={i18n.language}
              onChange={changeLanguage}
              styles={SEGMENTED_CONTROL_STYLES}
              data={SUPPORTED_LANGUAGES.map((language) => ({
                value: language,
                label: t(`language.${language}`),
              }))}
            />
          </Group>

          <Group justify="space-between" p="md">
            <Text c="text.6" fz={15} fw={600}>
              {t("settings.currency")}
            </Text>
            <SegmentedControl
              value={user?.currency ?? FALLBACK_CURRENCY}
              onChange={changeCurrency}
              styles={SEGMENTED_CONTROL_STYLES}
              data={SUPPORTED_CURRENCIES.map((currency) => ({ value: currency, label: currency }))}
            />
          </Group>

          {/* Silences the lock screen only - the notification is still written and the bell
              still counts it. */}
          <Group justify="space-between" p="md" wrap="nowrap">
            <Text c="text.6" fz={15} fw={600}>
              {t("settings.notifications")}
            </Text>
            <Switch
              withThumbIndicator={false}
              checked={notificationsEnabled}
              onChange={(event) => changeNotifications(event.currentTarget.checked)}
              aria-label={t("settings.notifications")}
              styles={{
                track: {
                  backgroundColor: notificationsEnabled
                    ? "var(--mantine-color-primary-6)"
                    : "var(--mantine-color-cards-4)",
                  borderColor: "var(--mantine-color-other-borderSolid)",
                },
                thumb: {
                  backgroundColor: notificationsEnabled ? "var(--mantine-color-black)" : "var(--mantine-color-text-6)",
                },
              }}
            />
          </Group>
        </Stack>
      </Card>

      <Text className="font-mono" fz={11} fw={400} tt="uppercase" lts="0.08em" c="var(--color-text-dim)" px="md">
        {t("settings.sectionAbout")}
      </Text>
      <Card bg="cards.6" className="m-3" p={0} radius="lg" style={{ border: "1px solid var(--mantine-color-inputs-5)" }}>
        <Stack gap={0}>
          {/* States the build; switches nothing. */}
          <Group justify="space-between" p="md" wrap="nowrap">
            <Text c="text.6" fz={15} fw={600}>
              {t("settings.version")}
            </Text>
            <Text className="font-mono" fz={13} c="var(--color-text-dim)">
              {__APP_VERSION__}
            </Text>
          </Group>

          {/* Both documents live on their own route, reachable without a session. */}
          <UnstyledButton onClick={() => navigate("/legal/terms")} className="w-full" p="md">
            <Group justify="space-between" wrap="nowrap">
              <Text c="text.6" fz={15} fw={600}>
                {t("settings.terms")}
              </Text>
              <ChevronRight size={18} color="var(--color-text-dim)" />
            </Group>
          </UnstyledButton>

          <UnstyledButton onClick={() => navigate("/legal/privacy")} className="w-full" p="md">
            <Group justify="space-between" wrap="nowrap">
              <Text c="text.6" fz={15} fw={600}>
                {t("settings.privacy")}
              </Text>
              <ChevronRight size={18} color="var(--color-text-dim)" />
            </Group>
          </UnstyledButton>
        </Stack>
      </Card>

      {/* Both ways out, in the same card as everything else on the page - the last one, because
          leaving is not why anyone opened it. */}
      <Card
        bg="cards.6"
        className="m-3"
        mb="calc(1.5rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))"
        p={0}
        radius="lg"
        style={{ border: "1px solid var(--mantine-color-inputs-5)" }}
      >
        <Stack gap={0}>
          {/* Nothing is lost by logging out, so it asks nothing before it does. */}
          <UnstyledButton onClick={signOut} disabled={logout.isPending || leaving} className="w-full" p="md">
            <Group justify="space-between" wrap="nowrap">
              <Text c="text.6" fz={15} fw={600}>
                {t("profile.logout")}
              </Text>
              <LogOut size={18} color="var(--color-text-dim)" />
            </Group>
          </UnstyledButton>

          {/* Under the way out, because it is the same move taken further - and the only row on
              the page that reads in red, so nobody reaches it by aiming badly. */}
          <UnstyledButton onClick={() => setDeletingAccount(true)} className="w-full" p="md">
            <Group justify="space-between" wrap="nowrap">
              <Text c="red.5" fz={15} fw={600}>
                {t("profile.deleteAccount")}
              </Text>
              <ChevronRight size={18} color="var(--mantine-color-red-5)" />
            </Group>
          </UnstyledButton>
        </Stack>
      </Card>

      <CustomPartsDrawer opened={customParts} onClose={() => setCustomParts(false)} />

      <BikeArchiveDrawer opened={archive} onClose={() => setArchive(false)} />

      <ProfileEditDrawer user={user} opened={editing} onClose={() => setEditing(false)} />

      <ChangePasswordDrawer opened={changingPassword} onClose={() => setChangingPassword(false)} />

      <DeleteAccountDrawer opened={deletingAccount} onClose={() => setDeletingAccount(false)} email={user.email} />
    </Stack>
  );
}
