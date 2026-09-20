// Somebody's garage at /u/:handle, the way a link in a chat opens it: outside the app shell,
// no session, the design's own look. Whatever the web rule closes is one plain page.
import type { ReactElement } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePublicProfileGarage } from "@/features/profile/profile.queries";
import { PublicClosed } from "@/features/profile/ui/public/PublicClosed";
import { PublicGarage } from "@/features/profile/ui/public/PublicGarage";
import { PublicMessage } from "@/features/profile/ui/public/PublicPieces";
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
        <p className="pp-mono px-4 py-24 text-center text-[11px] uppercase tracking-[0.14em] text-[var(--pp-paper-faint)]" aria-busy="true">
          {t("publicProfile.loading")}
        </p>
      </PublicShell>
    );
  }

  // Anything but a closed profile - a burst over the limit, the network - is a fault to retry by reload.
  if (!page) {
    return (
      <PublicShell handle={handle} title={t("publicProfile.title")} live={false}>
        <PublicMessage icon="i-link" title={t("publicProfile.loadFailedTitle")}>
          <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-[var(--pp-paper-dim)] sm:text-base">
            {t("publicProfile.loadFailedBody")}
          </p>
        </PublicMessage>
      </PublicShell>
    );
  }

  return (
    <PublicShell handle={handle} title={page.owner.name ?? page.owner.handle} live>
      <PublicGarage handle={handle} page={page} />
    </PublicShell>
  );
}
