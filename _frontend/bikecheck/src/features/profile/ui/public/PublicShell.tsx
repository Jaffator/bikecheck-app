// The furniture of every public page /u/*: the design's fonts and tokens, the sticky bar
// with the "Živé" pill and the CS/EN switch, the footer CTA. Outside the app shell, so it
// brings its own fonts and sprite and takes them away again.
import { useEffect, type ReactElement, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PLAY_STORE_URL, publicGaragePath } from "../../publicProfile";
import { usePublicLanguage } from "../../usePublicLanguage";
import { PUBLIC_ICON_SPRITE } from "./publicIcons";
import { Icon } from "./PublicPieces";
import "./publicProfile.css";

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..125,400..800&family=Martian+Mono:wdth,wght@75..112.5,400..700&display=swap";
const FONTS_ID = "pp-fonts";

// The app loads Inter; the design wants Archivo and Martian Mono. Linked while a public page
// is up, never in index.html.
function usePublicFonts(): void {
  useEffect(() => {
    if (document.getElementById(FONTS_ID)) return;
    const link = document.createElement("link");
    link.id = FONTS_ID;
    link.rel = "stylesheet";
    link.href = FONTS_HREF;
    document.head.appendChild(link);
    return () => link.remove();
  }, []);
}

function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} — BikeCheck`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

// A kind of page, not a connection: the dot is still.
function LivePill(): ReactElement {
  const { t } = useTranslation();

  return (
    <p className="pp-hairline flex min-w-0 items-center gap-2 rounded-full border bg-[var(--pp-card-inset)] px-2.5 py-1.5 sm:px-3">
      <span className="block size-1.5 shrink-0 rounded-full bg-[var(--pp-sage)]" aria-hidden="true" />
      <span className="pp-mono truncate text-[10px] leading-tight tracking-wide text-[var(--pp-paper-dim)] sm:text-[11px]">
        {t("publicProfile.live")}
      </span>
    </p>
  );
}

interface HeaderProps {
  handle: string;
  live: boolean;
  onToggleLanguage: () => void;
}

function Header({ handle, live, onToggleLanguage }: HeaderProps): ReactElement {
  const { t } = useTranslation();

  return (
    <header className="pp-hairline-strong sticky top-0 z-50 border-b bg-[rgba(23,24,26,0.95)] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <Link to={publicGaragePath(handle)} className="flex min-h-[44px] shrink-0 items-center gap-2.5">
          <Icon id="bc-mark" className="size-7 rounded-md" />
          <span className="pp-display hidden text-[15px] font-semibold tracking-tight sm:block">BikeCheck</span>
        </Link>
        <span className="hidden h-5 w-px bg-white/10 sm:block" aria-hidden="true" />
        <p className="pp-mono hidden text-[10px] uppercase tracking-[0.16em] text-[var(--pp-paper-dim)] sm:block">
          {t("publicProfile.title")}
        </p>
        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
          {live && <LivePill />}
          <button
            type="button"
            onClick={onToggleLanguage}
            aria-label={t("publicProfile.switchLanguage")}
            className="pp-mono pp-hairline flex min-h-[44px] items-center rounded-lg border px-3 text-[11px] uppercase tracking-wider text-[var(--pp-paper-dim)] transition-colors duration-200 hover:border-[rgba(206,192,83,0.4)] hover:text-[var(--pp-paper)]"
          >
            {t("publicProfile.langButton")}
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer(): ReactElement {
  const { t } = useTranslation();

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
              {t("publicProfile.footerNote")}
            </p>
          </div>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--pp-gold-500)] px-5 text-[15px] font-semibold text-[var(--pp-dark)] transition-colors duration-200 hover:bg-[var(--pp-gold-400)]"
          >
            {t("publicProfile.startGarage")}
          </a>
        </div>
      </div>
    </footer>
  );
}

interface PublicShellProps {
  handle: string;
  title: string;
  // Only a garage that opened is live; a closed or loading page wears no pill.
  live: boolean;
  children: ReactNode;
}

export function PublicShell({ handle, title, live, children }: PublicShellProps): ReactElement {
  const { language, toggle } = usePublicLanguage();
  usePublicFonts();
  useDocumentTitle(title);

  return (
    <div className="pp" lang={language}>
      <div className="pp-ambient" aria-hidden="true" />
      <div dangerouslySetInnerHTML={{ __html: PUBLIC_ICON_SPRITE }} />
      <div className="pp-content">
        <Header handle={handle} live={live} onToggleLanguage={toggle} />
        <main>{children}</main>
        <Footer />
      </div>
    </div>
  );
}
