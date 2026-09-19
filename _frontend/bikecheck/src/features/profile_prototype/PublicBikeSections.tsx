// PROTOTYPE #132 — throwaway. The three sections of the web bike page in the design's
// tokens: the Setup glass card (#120 variant C), the build as expandable rows with a
// category rail, the history as month groups paged by 20 (#117, row variant A).
import { useState, type ReactElement } from "react";
import dayjs from "dayjs";
import { componentIcon } from "@/assets/icons/svg_icons/components";
import { groupIcon } from "@/assets/icons/svg_icons/groups";
import { TYRE_PRESSURE_MAX } from "@/features/setup/pressure";
import { arcPath, arcStroke } from "@/features/setup/ui/gaugeMetrics";
import { SUSPENSION_PSI_MAX } from "@/features/setup/ui/SetupProfileForm";
import {
  activeProfileIndex,
  mountedTire,
  partCount,
  type MockBike,
  type MockCategory,
  type MockGarage,
  type MockPart,
  type MockService,
  type MockSetupProfile,
} from "./profile.mock";
import { COPY, catalogue, pick, type PublicLang } from "./publicProfile.copy";
import { formatNumber, money, pressure } from "./publicProfile.format";
import { Icon } from "./PublicShell";

const HISTORY_PAGE = 20;

// A category is drawn with the same icon the app gives its group; the sprite only covers
// a group the app has no icon for.
function categoryMark(category: MockCategory, className: string): ReactElement {
  const Mark = groupIcon(category.group);
  return Mark === null ? <Icon id="i-other" className={className} /> : <Mark className={className} />;
}

function categoryId(category: MockCategory): string {
  return `cat-${category.group.toLowerCase().replace(/[^a-z]+/g, "-")}`;
}

function partLabel(lang: PublicLang, part: MockPart): string {
  const type = catalogue(lang, part.type);
  return part.position ? `${type} ${catalogue(lang, part.position).toLowerCase()}` : type;
}

// ---- Setup ---------------------------------------------------------------------------

// One reading of the sheet as a gauge: the part's icon and name over the arc, the figure in
// it, and under it what else the reader may know - the tyre mounted, the sag it is set to.
interface Dial {
  label: string;
  // The icon of the part read - Tire, Fork, Shock - as the app draws it.
  icon: string;
  // In psi, as the mock keeps every pressure; the arc fills against the app's own ceiling.
  psi: number;
  max: number;
  // The figure and unit as the reader sees them.
  figure: string;
  unit: string;
  hint?: string;
  tire?: MockPart | null;
}

// The pressure split into figure and unit, so the unit can be set small under the figure.
function split(text: string): [string, string] {
  const at = text.lastIndexOf(" ");
  return [text.slice(0, at), text.slice(at + 1)];
}

// A tyre is read in bar with the psi small under it; suspension is always psi (ADR 0029).
function dials(lang: PublicLang, bike: MockBike, profile: MockSetupProfile): Dial[] {
  const tire = (label: string, psi: number, position: "Přední" | "Zadní"): Dial => {
    const [figure, unit] = split(pressure(lang, psi, "bar"));
    return {
      label,
      icon: "Tire",
      psi,
      max: TYRE_PRESSURE_MAX.psi,
      figure,
      unit,
      hint: `${formatNumber(lang, Math.round(psi))} psi`,
      tire: mountedTire(bike, position),
    };
  };
  const list: Dial[] = [
    tire(pick(lang, COPY.frontTyre), profile.frontTire, "Přední"),
    tire(pick(lang, COPY.rearTyre), profile.rearTire, "Zadní"),
  ];
  if (profile.fork) {
    list.push({
      label: pick(lang, COPY.fork),
      icon: "Fork",
      psi: profile.fork.psi,
      max: SUSPENSION_PSI_MAX,
      figure: String(profile.fork.psi),
      unit: "psi",
      hint: `${pick(lang, COPY.sag)} ${profile.fork.sag} %`,
    });
  }
  if (profile.shock) {
    list.push({
      label: pick(lang, COPY.shock),
      icon: "Shock",
      psi: profile.shock.psi,
      max: SUSPENSION_PSI_MAX,
      figure: String(profile.shock.psi),
      unit: "psi",
      hint: `${pick(lang, COPY.sag)} ${profile.shock.sag} %`,
    });
  }
  return list;
}

const GAUGE_SIZE = 112;

function partMark(componentType: string): ReactElement | null {
  const Icon = componentIcon(componentType);
  return Icon === null ? null : <Icon width={18} height={18} />;
}

// The app's gauge redrawn in the page's tokens: a gold arc on the inset, the figure inside.
function Gauge({ dial, showTire }: { dial: Dial; showTire: boolean }): ReactElement {
  const stroke = arcStroke(GAUGE_SIZE);
  const arc = arcPath(GAUGE_SIZE, stroke);
  const filled = Math.min(1, Math.max(0, dial.psi / dial.max));

  return (
    <div className="flex flex-col items-center text-center">
      <dt className="pp-mono flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--pp-paper-faint)]">
        {partMark(dial.icon)}
        {dial.label}
      </dt>
      <dd className="relative mt-2" style={{ width: GAUGE_SIZE, height: GAUGE_SIZE }}>
        <svg width={GAUGE_SIZE} height={GAUGE_SIZE} viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`} aria-hidden="true">
          <path d={arc} fill="none" stroke="var(--pp-card-inset)" strokeWidth={stroke} strokeLinecap="round" />
          {filled > 0 && (
            <path
              d={arc}
              fill="none"
              stroke="var(--pp-gold-500)"
              strokeWidth={stroke}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${filled} 1`}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: stroke }}>
          <span className="pp-mono text-[20px] font-bold leading-none tabular-nums text-[var(--pp-paper)]">{dial.figure}</span>
          <span className="pp-mono mt-1 text-[12px] leading-none text-[var(--pp-paper-dim)]">{dial.unit}</span>
          <span className="pp-mono mt-1 text-[11px] leading-none text-[var(--pp-paper-faint)]">{dial.hint ?? "\u00a0"}</span>
        </div>
      </dd>
      {showTire && dial.tire && (
        <dd className="pp-token mt-1 text-[13px] leading-snug">
          <span className="font-semibold">{dial.tire.brand}</span>{" "}
          <span className="text-[var(--pp-paper-dim)]">{dial.tire.model}</span>
          <span className="pp-mono block text-[11px] text-[var(--pp-paper-dim)]">{dial.tire.spec}</span>
        </dd>
      )}
    </div>
  );
}

function ClickList({
  lang,
  label,
  leg,
}: {
  lang: PublicLang;
  label: string;
  leg: NonNullable<MockSetupProfile["fork"]>;
}): ReactElement {
  const rows: [string, number][] = [
    [pick(lang, COPY.tokens), leg.tokens],
    [pick(lang, COPY.reboundLs), leg.clicks.lsr],
    [pick(lang, COPY.reboundHs), leg.clicks.hsr],
    [pick(lang, COPY.compressionLs), leg.clicks.lsc],
    [pick(lang, COPY.compressionHs), leg.clicks.hsc],
  ];
  return (
    <dl className="grid grid-cols-3 gap-x-3 gap-y-2">
      <dt className="pp-mono col-span-3 text-[10px] uppercase tracking-[0.14em] text-[var(--pp-gold-500)]">{label}</dt>
      {rows.map(([name, value]) => (
        <div key={name}>
          <dt className="pp-mono text-[10px] text-[var(--pp-paper-faint)]">{name}</dt>
          <dd className="pp-mono text-[13px] tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// The glass card straight under the hero grid; a bike without a profile has no card (#120).
export function SetupCard({
  lang,
  garage,
  bike,
}: {
  lang: PublicLang;
  garage: MockGarage;
  bike: MockBike;
}): ReactElement | null {
  const [index, setIndex] = useState(() => activeProfileIndex(bike));
  if (!garage.sections.setup || bike.profiles.length === 0) return null;
  const profile = bike.profiles[index] ?? bike.profiles[0];
  const showTires = garage.sections.components;

  return (
    <div id="setup" className="pp-glass mt-8 rounded-2xl p-4 sm:p-5 lg:mt-10">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--pp-card-inset)] text-[var(--pp-gold-500)]">
          <Icon id="i-dial" className="size-[18px]" />
        </span>
        <h2 className="pp-display text-[19px] font-bold tracking-tight">{pick(lang, COPY.setup)}</h2>
        {profile.active && (
          <span className="pp-mono rounded-full border border-[var(--pp-gold-500)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--pp-gold-500)]">
            {pick(lang, COPY.currentSetup)}
          </span>
        )}
        {bike.profiles.length > 1 && (
          <ul className="ml-auto flex flex-wrap gap-1.5" role="tablist">
            {bike.profiles.map((item, itemIndex) => (
              <li key={item.name}>
                <button
                  type="button"
                  role="tab"
                  aria-current={itemIndex === index}
                  onClick={() => setIndex(itemIndex)}
                  className="pp-seg pp-mono pp-hairline flex min-h-[40px] items-center rounded-lg border bg-[var(--pp-card-inset)] px-3.5 text-[11px] text-[var(--pp-paper-dim)] transition-colors"
                >
                  {item.active ? `● ${item.name}` : item.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
        {dials(lang, bike, profile).map((dial) => (
          <Gauge key={dial.label} dial={dial} showTire={showTires} />
        ))}
      </dl>
      {(profile.fork || profile.shock) && (
        <details className="pp-hairline mt-4 border-t pt-3">
          <summary className="pp-mono cursor-pointer list-none text-[11px] uppercase tracking-wider text-[var(--pp-paper-dim)] hover:text-[var(--pp-paper)]">
            {pick(lang, COPY.tokensAndClicks)}
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {profile.fork && <ClickList lang={lang} label={pick(lang, COPY.fork)} leg={profile.fork} />}
            {profile.shock && <ClickList lang={lang} label={pick(lang, COPY.shock)} leg={profile.shock} />}
          </div>
        </details>
      )}
    </div>
  );
}

// ---- Build ---------------------------------------------------------------------------

function PartRow({ lang, part, open }: { lang: PublicLang; part: MockPart; open: boolean }): ReactElement {
  return (
    <details className="pp-part-card rounded-xl" open={open}>
      <summary className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
        <div className="pp-token min-w-0 flex-1">
          <p className="pp-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pp-paper-dim)]">
            {partLabel(lang, part)}
          </p>
          <p className="mt-0.5 text-[15px] font-semibold leading-snug">
            {part.brand} <span className="font-normal text-[var(--pp-paper-dim)]">{part.model}</span>
          </p>
          <p className="pp-mono mt-0.5 text-[11px] leading-snug text-[var(--pp-paper-dim)] md:hidden">{part.spec}</p>
        </div>
        <p className="pp-token pp-mono hidden min-w-0 flex-1 text-[11px] leading-snug text-[var(--pp-paper-dim)] md:block">
          {part.spec}
        </p>
        <Icon id="i-chevron" className="pp-part-chev size-4 shrink-0 text-[var(--pp-paper-dim)]" />
      </summary>
      <div className="pp-hairline border-t px-3 pb-4 pt-3 sm:px-4">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="pp-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pp-paper-dim)]">
              {pick(lang, COPY.mounted)}
            </dt>
            <dd className="pp-token pp-mono mt-1 text-[12px] leading-snug text-[var(--pp-paper)]">
              {catalogue(lang, part.since)}
            </dd>
          </div>
          {part.km !== null && (
            <div>
              <dt className="pp-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pp-paper-dim)]">
                {pick(lang, COPY.distance)}
              </dt>
              <dd className="pp-token pp-mono mt-1 text-[12px] leading-snug text-[var(--pp-paper)]">
                {formatNumber(lang, part.km)} km
              </dd>
            </div>
          )}
        </dl>
      </div>
    </details>
  );
}

export function BuildSection({ lang, bike }: { lang: PublicLang; bike: MockBike }): ReactElement {
  // Expand all re-mounts the rows with `open`, which is all a throwaway needs.
  const [expanded, setExpanded] = useState(false);
  const categories = bike.categories;
  const total = partCount(bike);
  const intro = COPY.buildIntro(total, categories.length);

  return (
    <section id="osazeni" className="relative scroll-mt-32 overflow-hidden">
      <div className="relative mx-auto max-w-[1240px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="pp-display text-[26px] font-extrabold tracking-tight sm:text-[34px]">
              {pick(lang, COPY.build)}
            </h2>
            <p className="mt-2 max-w-[56ch] text-[15px] text-[var(--pp-paper-dim)]">{pick(lang, intro)}</p>
          </div>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
            className="pp-mono pp-hairline inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-3.5 text-[11px] uppercase tracking-wider text-[var(--pp-paper-dim)] transition-colors duration-200 hover:border-[rgba(206,192,83,0.4)] hover:text-[var(--pp-paper)]"
          >
            {pick(lang, expanded ? COPY.collapseAll : COPY.expandAll)}
          </button>
        </div>
        <nav className="pp-hairline sticky top-[65px] z-40 -mx-4 mt-6 border-y bg-[rgba(10,10,11,0.9)] px-4 py-2.5 backdrop-blur-xl lg:hidden">
          <ul className="pp-rail flex gap-2 overflow-x-auto">
            {categories.map((category) => (
              <li key={category.group}>
                <a
                  href={`#${categoryId(category)}`}
                  className="pp-chip pp-mono pp-hairline flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-lg border bg-[var(--pp-card-inset)] px-3 text-[11px] text-[var(--pp-paper-dim)] transition-colors duration-200"
                >
                  {catalogue(lang, category.name)}
                  <span className="tabular-nums opacity-60">{category.parts.length}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[210px_1fr] lg:gap-10">
          <nav className="hidden lg:block">
            <ul className="pp-hairline sticky top-24 space-y-0.5 border-l">
              {categories.map((category) => (
                <li key={category.group}>
                  <a
                    href={`#${categoryId(category)}`}
                    className="pp-navlink flex min-h-[44px] items-center gap-2.5 border-l-2 border-transparent px-3 text-[13px] text-[var(--pp-paper-dim)] transition-colors duration-200 hover:text-[var(--pp-paper)]"
                  >
                    {categoryMark(category, "size-4 shrink-0 opacity-70")}
                    <span className="min-w-0 flex-1 truncate">{catalogue(lang, category.name)}</span>
                    <span className="pp-mono text-[10px] tabular-nums opacity-60">{category.parts.length}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="min-w-0 space-y-10">
            {categories.map((category) => (
              <section key={category.group} id={categoryId(category)} className="scroll-mt-32 lg:scroll-mt-24">
                <div className="pp-hairline flex items-center gap-3 border-b pb-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--pp-card-inset)] text-[var(--pp-gold-500)]">
                    {categoryMark(category, "size-[18px]")}
                  </span>
                  <h3 className="pp-display text-[19px] font-bold tracking-tight sm:text-[21px]">
                    {catalogue(lang, category.name)}
                  </h3>
                  <span className="pp-mono ml-auto text-[11px] tabular-nums text-[var(--pp-paper-dim)]">
                    {category.parts.length}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {category.parts.map((part, index) => (
                    <PartRow key={`${expanded}-${index}`} lang={lang} part={part} open={expanded} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- History -------------------------------------------------------------------------

function serviceDate(lang: PublicLang, date: string): string {
  return dayjs(date).format(lang === "cs" ? "D. M. YYYY" : "D MMM YYYY");
}

function monthLabel(lang: PublicLang, date: string): string {
  const label = dayjs(date).locale(lang).format("MMMM YYYY");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

interface MonthGroup {
  key: string;
  label: string;
  undated: boolean;
  services: MockService[];
  total: number;
}

function groupByMonth(lang: PublicLang, services: MockService[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const service of services) {
    const key = service.date ? service.date.slice(0, 7) : "none";
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = {
        key,
        label: service.date ? monthLabel(lang, service.date) : pick(lang, COPY.undated),
        undated: !service.date,
        services: [],
        total: 0,
      };
      groups.push(group);
    }
    group.services.push(service);
    group.total += service.cost ?? 0;
  }
  return groups;
}

function ServiceRow({
  lang,
  garage,
  service,
}: {
  lang: PublicLang;
  garage: MockGarage;
  service: MockService;
}): ReactElement {
  return (
    <li className="pp-hairline rounded-xl border bg-[var(--pp-card)] p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="pp-mono text-[11px] tabular-nums text-[var(--pp-paper-dim)]">
          {service.date ? serviceDate(lang, service.date) : "—"}
        </p>
        <p className="text-[15px] font-semibold leading-snug">
          {service.actions.map((action, index) => (
            <span key={action}>
              {index > 0 && <span className="text-[var(--pp-paper-faint)]"> · </span>}
              {catalogue(lang, action)}
            </span>
          ))}
        </p>
        {service.replacement && (
          <span className="pp-mono rounded-md border border-[rgba(206,192,83,0.4)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[var(--pp-gold-500)]">
            {pick(lang, COPY.swap)}
          </span>
        )}
        {garage.sections.costs && service.cost !== null && (
          <p className="pp-mono ml-auto text-[12px] tabular-nums text-[var(--pp-gold-500)]">
            {money(lang, service.cost, garage.currency)}
          </p>
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {service.parts.map((part) => (
          <li
            key={part}
            className="pp-mono rounded-md bg-[var(--pp-card-inset)] px-2 py-1 text-[10px] text-[var(--pp-paper-dim)]"
          >
            {catalogue(lang, part)}
          </li>
        ))}
      </ul>
    </li>
  );
}

function Tile({ label, value }: { label: string; value: string | number }): ReactElement {
  return (
    <div className="pp-hairline rounded-xl border bg-[var(--pp-card)] px-3 py-3 sm:px-4">
      <dt className="pp-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pp-paper-dim)]">{label}</dt>
      <dd className="pp-mono mt-1 whitespace-nowrap text-[17px] tabular-nums leading-none sm:text-[20px]">{value}</dd>
    </div>
  );
}

export function HistorySection({
  lang,
  garage,
  bike,
}: {
  lang: PublicLang;
  garage: MockGarage;
  bike: MockBike;
}): ReactElement {
  const [shown, setShown] = useState(HISTORY_PAGE);
  const services = bike.services;
  const groups = groupByMonth(lang, services.slice(0, shown));
  const rest = services.length - Math.min(shown, services.length);
  const swaps = services.filter((service) => service.replacement).length;
  const spent = services.reduce((sum, service) => sum + (service.cost ?? 0), 0);
  const withCosts = garage.sections.costs;

  return (
    <section id="servis" className="pp-hairline scroll-mt-32 border-t bg-[rgba(16,16,18,0.4)]">
      <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <h2 className="pp-display text-[26px] font-extrabold tracking-tight sm:text-[34px]">
          {pick(lang, COPY.serviceHistory)}
        </h2>
        <dl className={`mt-6 grid gap-2 sm:gap-3 ${withCosts ? "grid-cols-3 sm:max-w-xl" : "grid-cols-2 sm:max-w-sm"}`}>
          <Tile label={pick(lang, COPY.services)} value={services.length} />
          <Tile label={pick(lang, COPY.swaps)} value={swaps} />
          {withCosts && <Tile label={pick(lang, COPY.spent)} value={money(lang, spent, garage.currency)} />}
        </dl>
        <div className="mt-8 space-y-8">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="pp-hairline flex items-baseline justify-between gap-4 border-b pb-2">
                <h3
                  className={`pp-mono text-[11px] uppercase tracking-[0.16em] ${group.undated ? "text-[var(--pp-paper-faint)]" : "text-[var(--pp-gold-500)]"}`}
                >
                  {group.label}
                </h3>
                {withCosts && group.total > 0 && (
                  <p className="pp-mono text-[12px] tabular-nums text-[var(--pp-paper-dim)]">
                    {money(lang, group.total, garage.currency)}
                  </p>
                )}
              </div>
              <ul className="mt-3 space-y-1.5">
                {group.services.map((service) => (
                  <ServiceRow key={service.id} lang={lang} garage={garage} service={service} />
                ))}
              </ul>
            </div>
          ))}
        </div>
        {rest > 0 && (
          <button
            type="button"
            onClick={() => setShown((value) => value + HISTORY_PAGE)}
            className="pp-hairline-strong mt-8 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border px-5 text-[15px] font-medium text-[var(--pp-paper)] transition-colors hover:border-[rgba(206,192,83,0.4)] sm:w-auto"
          >
            {pick(lang, COPY.showOlder)}
            <span className="pp-mono text-[12px] tabular-nums text-[var(--pp-paper-dim)]">{rest}</span>
          </button>
        )}
      </div>
    </section>
  );
}
