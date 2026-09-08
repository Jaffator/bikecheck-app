// Settings page.
import { useState, type ReactElement } from "react";
import { Card, Group, SegmentedControl, Text, UnstyledButton } from "@mantine/core";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrentUser, useUpdateUser } from "../users/users.queries";
import { SUPPORTED_LANGUAGES, applyLanguage } from "@/i18n";
import { FALLBACK_CURRENCY, SUPPORTED_CURRENCIES } from "@/utils/money";
import { CustomPartsDrawer } from "./CustomPartsDrawer";
import { BikeArchiveDrawer } from "./BikeArchiveDrawer";

export function Settings(): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const updateUser = useUpdateUser();
  const [customParts, setCustomParts] = useState(false);
  const [archive, setArchive] = useState(false);

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
      <Card bg="cards.6" className="m-3" radius="lg" style={{ border: "1px solid var(--mantine-color-cards-5)" }}>
        <Group justify="space-between">
          <Text c="text.6">{t("settings.language")}</Text>
          <SegmentedControl
            value={i18n.language}
            onChange={changeLanguage}
            data={SUPPORTED_LANGUAGES.map((language) => ({
              value: language,
              label: t(`language.${language}`),
            }))}
          />
        </Group>
      </Card>
      <Card bg="cards.6" className="m-3" radius="lg" style={{ border: "1px solid var(--mantine-color-cards-5)" }}>
        <Group justify="space-between">
          <Text c="text.6">{t("settings.currency")}</Text>
          <SegmentedControl
            value={user?.currency ?? FALLBACK_CURRENCY}
            onChange={changeCurrency}
            data={SUPPORTED_CURRENCIES.map((currency) => ({ value: currency, label: currency }))}
          />
        </Group>
      </Card>
      {/* The parts the owner named themselves. A list rather than a setting, so it opens
          over the page instead of resolving in place. */}
      <Card bg="cards.6" className="m-3" p={0} radius="lg" style={{ border: "1px solid var(--mantine-color-cards-5)" }}>
        <UnstyledButton onClick={() => setCustomParts(true)} className="w-full" p="md">
          <Group justify="space-between" wrap="nowrap">
            <Text c="text.6">{t("settings.customParts")}</Text>
            <ChevronRight size={18} color="var(--color-text-dim)" />
          </Group>
        </UnstyledButton>
      </Card>

      {/* The bikes taken out of use. A list rather than a setting, so it opens over the
          page the way the custom parts do - and it is the only door to the archive. */}
      <Card bg="cards.6" className="m-3" p={0} radius="lg" style={{ border: "1px solid var(--mantine-color-cards-5)" }}>
        <UnstyledButton onClick={() => setArchive(true)} className="w-full" p="md">
          <Group justify="space-between" wrap="nowrap">
            <Text c="text.6">{t("settings.bikeArchive")}</Text>
            <ChevronRight size={18} color="var(--color-text-dim)" />
          </Group>
        </UnstyledButton>
      </Card>

      <CustomPartsDrawer opened={customParts} onClose={() => setCustomParts(false)} />

      <BikeArchiveDrawer opened={archive} onClose={() => setArchive(false)} />
    </>
  );
}
