// Settings page.
import { useState, type ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, Group, SegmentedControl, Stack, Switch, Text, UnstyledButton } from "@mantine/core";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrentUser, useUpdateUser } from "@/features/users/users.queries";
import { SUPPORTED_LANGUAGES, applyLanguage } from "@/i18n";
import { FALLBACK_CURRENCY, SUPPORTED_CURRENCIES } from "@/utils/money";
import { CustomPartsDrawer } from "./CustomPartsDrawer";
import { BikeArchiveDrawer } from "./BikeArchiveDrawer";

// Darker than Mantine's light-scheme default, to sit on the dark card without glowing.
const SEGMENTED_CONTROL_STYLES = {
  root: { backgroundColor: "var(--mantine-color-inputs-6)" },
  indicator: { backgroundColor: "var(--mantine-color-cards-5)" },
  label: { color: "var(--color-text-dim)" },
} as const;

export function Settings(): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const updateUser = useUpdateUser();
  const navigate = useNavigate();
  const [customParts, setCustomParts] = useState(false);
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

  // Null is a user who never touched the switch, which the backend reads as on.
  const notificationsEnabled = user?.notifications_enabled !== false;

  return (
    <>
      <Text className="font-mono" fz={11} fw={400} tt="uppercase" lts="0.08em" c="var(--color-text-dim)" px="md" pt="md">
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

      <CustomPartsDrawer opened={customParts} onClose={() => setCustomParts(false)} />

      <BikeArchiveDrawer opened={archive} onClose={() => setArchive(false)} />
    </>
  );
}
