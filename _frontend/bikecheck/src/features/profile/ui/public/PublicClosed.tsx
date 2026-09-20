// The one page every closed address opens: Off, followers only and an unknown handle read
// the same, so nothing leaks. A follower's way in is the app, through the listing.
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { PLAY_STORE_URL } from "../../publicProfile";
import { Icon, PublicMessage } from "./PublicPieces";

export function PublicClosed(): ReactElement {
  const { t } = useTranslation();

  return (
    <PublicMessage icon="i-link" title={t("publicProfile.closedTitle")}>
      <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-[var(--pp-paper)] sm:text-base">
        {t("publicProfile.closedFollower")}
      </p>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener"
        className="pp-hairline-strong mt-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-5 text-[15px] font-medium text-[var(--pp-paper)] transition-colors duration-200 hover:border-[rgba(206,192,83,0.4)]"
      >
        {t("publicProfile.openInApp")}
        <Icon id="i-arrow" className="size-4 text-[var(--pp-paper-dim)]" />
      </a>
    </PublicMessage>
  );
}
