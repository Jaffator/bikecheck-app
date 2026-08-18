// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Card, Group, SegmentedControl, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useCurrentUser, useUpdateUser } from "../users/users.queries";
import { SUPPORTED_LANGUAGES, applyLanguage } from "@/i18n";
import { StravaStatusCard } from "../strava/StravaStatusCard";

export function Settings(): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const updateUser = useUpdateUser();

  // Switch first so the UI reacts immediately, then persist — the stored value
  // is what other devices pick up on their next start.
  function changeLanguage(language: string): void {
    void applyLanguage(language);
    if (user) {
      updateUser.mutate({ id: user.id, data: { language } });
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
      {/* Settings manages an existing link only — connecting is offered on the
          dashboard, so nothing renders here until an account is linked. */}
      <StravaStatusCard connectedOnly allowDisconnect />
    </>
  );
}
