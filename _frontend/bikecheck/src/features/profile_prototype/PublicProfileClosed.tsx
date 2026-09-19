// PROTOTYPE #132 — throwaway. The one page every closed address opens (#116): OFF,
// followers only and an unknown handle read the same, so nothing leaks. The follower's
// way in is the app (#127) — the listing, not a custom scheme.
import type { ReactElement } from "react";
import { COPY, PLAY_STORE_URL, pick, type PublicLang } from "./publicProfile.copy";
import { Icon, PublicShell } from "./PublicShell";

interface PublicProfileClosedProps {
  handle: string;
  lang: PublicLang;
  onToggleLang: () => void;
}

export function PublicProfileClosed({ handle, lang, onToggleLang }: PublicProfileClosedProps): ReactElement {
  return (
    <PublicShell lang={lang} onToggleLang={onToggleLang} handle={handle} title={pick(lang, COPY.closedTitle)} closed>
      <section className="mx-auto flex max-w-[1240px] flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8">
        <span className="pp-hairline flex size-14 items-center justify-center rounded-2xl border bg-[var(--pp-card-inset)] text-[var(--pp-paper-faint)]">
          <Icon id="i-link" className="size-6" />
        </span>
        <h1 className="pp-display mt-6 text-[28px] font-extrabold leading-[1.1] tracking-tight sm:text-[36px]">
          {pick(lang, COPY.closedTitle)}
        </h1>
        <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-[var(--pp-paper-dim)] sm:text-base">
          {pick(lang, COPY.closedBody)}
        </p>
        <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-[var(--pp-paper)]">
          {pick(lang, COPY.closedFollower)}
        </p>
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener"
          className="pp-hairline-strong mt-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-5 text-[15px] font-medium text-[var(--pp-paper)] transition-colors duration-200 hover:border-[rgba(206,192,83,0.4)]"
        >
          {pick(lang, COPY.openInApp)}
          <Icon id="i-arrow" className="size-4 text-[var(--pp-paper-dim)]" />
        </a>
      </section>
    </PublicShell>
  );
}
