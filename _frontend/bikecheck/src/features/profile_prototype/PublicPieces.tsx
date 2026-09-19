// PROTOTYPE #132 — throwaway. The small pieces both public pages draw: a reading, a chip
// row, the photo box with its "no photo" fallback, the stats line under a bike.
import type { ReactElement, ReactNode } from "react";
import { partCount, type MockBike, type MockGarage } from "./profile.mock";
import { COPY, catalogue, pick, type PublicLang } from "./publicProfile.copy";
import { formatNumber } from "./publicProfile.format";
import { Icon } from "./PublicShell";

export function Reading({
  label,
  value,
  unit,
  size = "text-[22px] sm:text-[26px]",
  children,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  size?: string;
  children?: ReactNode;
}): ReactElement {
  return (
    <div>
      <dt className="pp-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pp-paper-faint)]">{label}</dt>
      <dd className={`pp-mono mt-1.5 tabular-nums leading-none text-[var(--pp-paper)] ${size}`}>
        {value}
        {unit && <span className="ml-1 text-[13px] text-[var(--pp-paper-faint)]">{unit}</span>}
      </dd>
      {children}
    </div>
  );
}

export function Chips({ lang, items }: { lang: PublicLang; items: string[] }): ReactElement {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="pp-mono pp-hairline rounded-md border bg-[var(--pp-card-inset)] px-2.5 py-1 text-[11px] text-[var(--pp-paper-dim)]"
        >
          {catalogue(lang, item)}
        </li>
      ))}
    </ul>
  );
}

export function PhotoBox({
  lang,
  bike,
  className = "",
}: {
  lang: PublicLang;
  bike: MockBike;
  className?: string;
}): ReactElement {
  if (bike.photo) {
    return (
      <img
        src={bike.photo}
        alt={`${bike.name} ${bike.model}`}
        loading="lazy"
        decoding="async"
        className={`${className} h-full w-full object-contain`}
      />
    );
  }
  return (
    <div
      className={`${className} flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--pp-card-inset)] text-[var(--pp-paper-faint)]`}
    >
      <Icon id="i-bike" className="size-10 opacity-60" />
      <span className="pp-mono text-[10px] uppercase tracking-[0.14em]">{pick(lang, COPY.noPhoto)}</span>
    </div>
  );
}

// The mono line under a bike: km, then parts and services only while shared (#120).
export function BikeStats({
  lang,
  garage,
  bike,
}: {
  lang: PublicLang;
  garage: MockGarage;
  bike: MockBike;
}): ReactElement {
  const bits = [`${formatNumber(lang, bike.km)} km`];
  if (garage.sections.components) bits.push(`${partCount(bike)} ${pick(lang, COPY.parts)}`);
  if (garage.sections.history) bits.push(`${bike.services.length} ${pick(lang, COPY.servicesLower)}`);
  return (
    <>
      {bits.map((bit, index) => (
        <span key={bit}>
          {index > 0 && <span className="text-[var(--pp-paper-faint)]"> · </span>}
          {bit}
        </span>
      ))}
    </>
  );
}
