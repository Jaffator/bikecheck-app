// PROTOTYPE #132 — throwaway. The furniture of the public page /u/<handle>: the design's
// fonts and tokens, the sticky bar with the "Živé" pill (#116: a kind of page, not a
// connection), the CS/EN switch (#118), the footer CTA (#127). Ported from
// Design/Live Bikecheck report/prototype-profile.html, variant A.
import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { PUBLIC_ICON_SPRITE } from "./publicIcons";
import { COPY, PLAY_STORE_URL, pick, type PublicLang } from "./publicProfile.copy";
import { garagePath, type PublicOwner } from "./publicProfile.model";
import { PublicPrototypeBar } from "./PublicPrototypeBar";
import "./publicProfile.css";

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..125,400..800&family=Martian+Mono:wdth,wght@75..112.5,400..700&display=swap";
const FONTS_ID = "pp-fonts";
const TOAST_MS = 2200;

// The app loads Inter; the design wants Archivo and Martian Mono. Linked once, on demand.
function usePublicFonts(): void {
  useEffect(() => {
    if (document.getElementById(FONTS_ID)) return;
    const link = document.createElement("link");
    link.id = FONTS_ID;
    link.rel = "stylesheet";
    link.href = FONTS_HREF;
    document.head.appendChild(link);
  }, []);
}

export function Icon({ id, className }: { id: string; className?: string }): ReactElement {
  return (
    <svg className={className} aria-hidden="true">
      <use href={`#${id}`} />
    </svg>
  );
}

export function Avatar({ owner, className }: { owner: PublicOwner; className: string }): ReactElement {
  return (
    <span
      className={`pp-display flex shrink-0 items-center justify-center rounded-full bg-[var(--pp-gold-500)] font-bold text-[var(--pp-dark)] ${className}`}
      aria-hidden="true"
    >
      {owner.initials}
    </span>
  );
}

function LivePill({ lang }: { lang: PublicLang }): ReactElement {
  return (
    <p className="pp-hairline flex min-w-0 items-center gap-2 rounded-full border bg-[var(--pp-card-inset)] px-2.5 py-1.5 sm:px-3">
      <span className="block size-1.5 shrink-0 rounded-full bg-[var(--pp-sage)]" aria-hidden="true" />
      <span className="pp-mono truncate text-[10px] leading-tight tracking-wide text-[var(--pp-paper-dim)] sm:text-[11px]">
        {pick(lang, COPY.live)}
      </span>
    </p>
  );
}

interface HeaderProps {
  lang: PublicLang;
  onToggleLang: () => void;
  garageHref: string;
  // A closed page is not a live one: no pill, no link to copy.
  closed: boolean;
}

function Header({ lang, onToggleLang, garageHref, closed }: HeaderProps): ReactElement {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (toast === null) return;
    const timeout = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast(pick(lang, COPY.copied));
    } catch {
      setToast(pick(lang, COPY.copyFailed));
    }
  }

  return (
    <header className="pp-hairline-strong sticky top-0 z-50 border-b bg-[rgba(23,24,26,0.95)] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <Link to={garageHref} className="flex min-h-[44px] shrink-0 items-center gap-2.5">
          <Icon id="bc-mark" className="size-7 rounded-md" />
          <span className="pp-display hidden text-[15px] font-semibold tracking-tight sm:block">BikeCheck</span>
        </Link>
        <span className="hidden h-5 w-px bg-white/10 sm:block" aria-hidden="true" />
        <p className="pp-mono hidden text-[10px] uppercase tracking-[0.16em] text-[var(--pp-paper-dim)] sm:block">
          {pick(lang, COPY.publicProfileTitle)}
        </p>
        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
          {!closed && <LivePill lang={lang} />}
          <button
            type="button"
            onClick={onToggleLang}
            className="pp-mono pp-hairline flex min-h-[44px] items-center rounded-lg border px-3 text-[11px] uppercase tracking-wider text-[var(--pp-paper-dim)] transition-colors duration-200 hover:border-[rgba(206,192,83,0.4)] hover:text-[var(--pp-paper)]"
          >
            {pick(lang, COPY.langButton)}
          </button>
          {!closed && (
            <button
              type="button"
              onClick={() => void copy()}
              className="pp-hairline flex size-11 items-center justify-center rounded-lg border text-[var(--pp-paper-dim)] transition-colors duration-200 hover:border-[rgba(206,192,83,0.4)] hover:text-[var(--pp-paper)]"
            >
              <Icon id="i-link" className="size-4" />
              <span className="sr-only">{pick(lang, COPY.copyLink)}</span>
            </button>
          )}
        </div>
      </div>
      {toast !== null && (
        <p className="bg-[var(--pp-gold-500)] px-4 py-1.5 text-center text-[12px] font-medium text-[var(--pp-dark)]">
          {toast}
        </p>
      )}
    </header>
  );
}

function Footer({ lang }: { lang: PublicLang }): ReactElement {
  return (
    <footer className="pp-hairline border-t">
      <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <Icon id="bc-mark" className="size-8 rounded-md" />
              <p className="pp-display text-[17px] font-bold tracking-tight">BikeCheck</p>
            </div>
            <p className="mt-3 max-w-[54ch] text-[14px] leading-relaxed text-[var(--pp-paper-dim)]">
              {pick(lang, COPY.footerNote)}
            </p>
          </div>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--pp-gold-500)] px-5 text-[15px] font-semibold text-[var(--pp-dark)] transition-colors duration-200 hover:bg-[var(--pp-gold-400)]"
          >
            {pick(lang, COPY.startGarage)}
          </a>
        </div>
      </div>
    </footer>
  );
}

interface PublicShellProps {
  lang: PublicLang;
  onToggleLang: () => void;
  handle: string;
  title: string;
  closed?: boolean;
  children: ReactNode;
}

export function PublicShell({
  lang,
  onToggleLang,
  handle,
  title,
  closed = false,
  children,
}: PublicShellProps): ReactElement {
  usePublicFonts();

  useEffect(() => {
    const previous = document.title;
    document.title = `${title} — BikeCheck`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  return (
    <div className="pp" lang={lang}>
      <div className="pp-ambient" aria-hidden="true" />
      <div dangerouslySetInnerHTML={{ __html: PUBLIC_ICON_SPRITE }} />
      <div className="pp-content">
        <Header lang={lang} onToggleLang={onToggleLang} garageHref={garagePath(handle)} closed={closed} />
        <main>{children}</main>
        <Footer lang={lang} />
      </div>
      <PublicPrototypeBar handle={handle} lang={lang} />
    </div>
  );
}
