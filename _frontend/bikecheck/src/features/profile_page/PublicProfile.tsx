// Somebody's garage at /u/:handle, the way a link in a chat opens it: outside the app shell,
// no session, the design's own look. Whatever the web rule closes is one plain page.
import type { ReactElement } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePublicProfileGarage } from "@/features/profile/profile.queries";
import { PublicClosed } from "@/features/profile/ui/public/PublicClosed";
import { PublicGarage } from "@/features/profile/ui/public/PublicGarage";
import { PublicLoadFailed, PublicLoading } from "@/features/profile/ui/public/PublicPieces";
import { PublicShell } from "@/features/profile/ui/public/PublicShell";

const NOT_FOUND_STATUS = 404;

export function PublicProfile(): ReactElement {
  const { t } = useTranslation();
  const { handle = "" } = useParams<{ handle: string }>();
  const { data: page, isLoading, error } = usePublicProfileGarage(handle);

  if (error?.status === NOT_FOUND_STATUS) {
    return (
      <PublicShell handle={handle} title={t("publicProfile.closedTitle")} live={false}>
        <PublicClosed />
      </PublicShell>
    );
  }

  if (isLoading) {
    return (
      <PublicShell handle={handle} title={t("publicProfile.title")} live={false}>
        <PublicLoading />
      </PublicShell>
    );
  }

  if (!page) {
    return (
      <PublicShell handle={handle} title={t("publicProfile.title")} live={false}>
        <PublicLoadFailed />
      </PublicShell>
    );
  }

  return (
    <PublicShell handle={handle} title={page.owner.name ?? page.owner.handle} live>
      <PublicGarage handle={handle} page={page} />
    </PublicShell>
  );
}
