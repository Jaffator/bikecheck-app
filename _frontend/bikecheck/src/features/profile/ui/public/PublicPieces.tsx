// The small pieces the public pages draw: a sprite icon, the owner's avatar, a reading, a
// chip row, the photo box with its "no photo" fallback, one centred message, and the two
// states every page passes through before it has its data.
import type { ReactElement, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { initialsOf } from "../../publicProfile";
import type { ProfileOwner } from "../../profile.types";

export function Icon({ id, className }: { id: string; className?: string }): ReactElement {
  return (
    <svg className={className} aria-hidden="true">
      <use href={`#${id}`} />
    </svg>
  );
}

// The account picture when there is one; initials on gold when there is not, as the app's header.
export function PublicAvatar({ owner, className }: { owner: ProfileOwner; className: string }): ReactElement {
  if (owner.avatar_url) {
    return (
      <img
        src={owner.avatar_url}
        alt=""
        referrerPolicy="no-referrer"
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      className={`pp-display flex shrink-0 items-center justify-center rounded-full bg-[var(--pp-gold-500)] font-bold text-[var(--pp-dark)] ${className}`}
      aria-hidden="true"
    >
      {initialsOf(owner.name, owner.handle)}
    </span>
  );
}

interface ReadingProps {
  label: string;
  value: ReactNode;
  unit?: string;
}

export function Reading({ label, value, unit }: ReadingProps): ReactElement {
  return (
    <div>
      <dt className="pp-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pp-paper-faint)]">{label}</dt>
      <dd className="pp-mono mt-1.5 text-[22px] tabular-nums leading-none text-[var(--pp-paper)] sm:text-[26px]">
        {value}
        {unit && <span className="ml-1 text-[13px] text-[var(--pp-paper-faint)]">{unit}</span>}
      </dd>
    </div>
  );
}

export function Chips({ items }: { items: string[] }): ReactElement {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="pp-mono pp-hairline rounded-md border bg-[var(--pp-card-inset)] px-2.5 py-1 text-[11px] text-[var(--pp-paper-dim)]"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

// The bike letterboxed, never cropped: many photos are cut-outs and a wheel cut off reads as broken.
export function PhotoBox({ imageUrl, alt }: { imageUrl: string | null; alt: string }): ReactElement {
  const { t } = useTranslation();

  if (imageUrl) {
    return <img src={imageUrl} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-contain" />;
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--pp-card-inset)] text-[var(--pp-paper-faint)]">
      <Icon id="i-bike" className="size-10 opacity-60" />
      <span className="pp-mono text-[10px] uppercase tracking-[0.14em]">{t("publicProfile.noPhoto")}</span>
    </div>
  );
}

interface PublicMessageProps {
  icon: string;
  title: string;
  children?: ReactNode;
}

// One centred message where a garage would be: the closed page, a failed load.
export function PublicMessage({ icon, title, children }: PublicMessageProps): ReactElement {
  return (
    <section className="mx-auto flex max-w-[1240px] flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8">
      <span className="pp-hairline flex size-14 items-center justify-center rounded-2xl border bg-[var(--pp-card-inset)] text-[var(--pp-paper-faint)]">
        <Icon id={icon} className="size-6" />
      </span>
      <h1 className="pp-display mt-6 text-[28px] font-extrabold leading-[1.1] tracking-tight sm:text-[36px]">{title}</h1>
      {children}
    </section>
  );
}

export function PublicLoading(): ReactElement {
  const { t } = useTranslation();

  return (
    <p
      className="pp-mono px-4 py-24 text-center text-[11px] uppercase tracking-[0.14em] text-[var(--pp-paper-faint)]"
      aria-busy="true"
    >
      {t("publicProfile.loading")}
    </p>
  );
}

// Anything but a closed profile - a burst over the limit, the network - is a fault to retry by reload.
export function PublicLoadFailed(): ReactElement {
  const { t } = useTranslation();

  return (
    <PublicMessage icon="i-link" title={t("publicProfile.loadFailedTitle")}>
      <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-[var(--pp-paper-dim)] sm:text-base">
        {t("publicProfile.loadFailedBody")}
      </p>
    </PublicMessage>
  );
}
