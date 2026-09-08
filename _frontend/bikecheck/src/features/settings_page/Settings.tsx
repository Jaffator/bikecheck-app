// Settings page.
import { useState, type ReactElement } from "react";
import { useLocation } from "react-router-dom";
import { Card, Group, SegmentedControl, Stack, Text, UnstyledButton } from "@mantine/core";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrentUser, useUpdateUser } from "../users/users.queries";
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

      <CustomPartsDrawer opened={customParts} onClose={() => setCustomParts(false)} />

      <BikeArchiveDrawer opened={archive} onClose={() => setArchive(false)} />
    </>
  );
}
