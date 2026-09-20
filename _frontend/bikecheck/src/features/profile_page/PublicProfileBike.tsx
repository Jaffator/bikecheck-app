// One of somebody's bikes at /u/:handle/:bikeId. The shell only for now: the bike page
// itself lands with the next slice of PRD #131.
import type { ReactElement } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PublicShell } from "@/features/profile/ui/public/PublicShell";

export function PublicProfileBike(): ReactElement {
  const { t } = useTranslation();
  const { handle = "" } = useParams<{ handle: string }>();

  return (
    <PublicShell handle={handle} title={t("publicProfile.title")} live={false}>
      <div />
    </PublicShell>
  );
}
