// Settings page.
import type { ReactElement } from "react";
import { Card, Group, SegmentedControl, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useCurrentUser, useUpdateUser } from "../users/users.queries";
import { SUPPORTED_LANGUAGES, applyLanguage } from "@/i18n";
import { StravaStatusCard } from "../strava/StravaStatusCard";
import { FALLBACK_CURRENCY, SUPPORTED_CURRENCIES } from "@/utils/money";

export function Settings(): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const updateUser = useUpdateUser();

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
      <Card bg="cards.6" className="m-3 border">
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
      <Card bg="cards.6" className="m-3 border">
        <Group justify="space-between">
          <Text c="text.6">{t("settings.currency")}</Text>
          <SegmentedControl
            value={user?.currency ?? FALLBACK_CURRENCY}
            onChange={changeCurrency}
            data={SUPPORTED_CURRENCIES.map((currency) => ({ value: currency, label: currency }))}
          />
        </Group>
      </Card>
      {/* Show only an existing Strava connection. */}
      <div className="m-3">
        <StravaStatusCard connectedOnly allowDisconnect />
      </div>
    </>
  );
}
