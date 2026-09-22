// The Setup of the bike as one glass card under the hero grid: it opens on the profile the
// bike is ridden at, the others tabs away under the title; four gauges in the page's tokens -
// tyres in the owner's unit, suspension in psi with its sag (ADR 0029) - with the tokens and
// clicks folded under them.
import { useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { componentIcon } from "@/assets/icons/svg_icons/components";
import type { TirePressureUnit } from "@/features/users/users.types";
import { useSeededName } from "@/i18n/useSeededName";
import type { ProfileLeg, ProfileSetupProfile } from "../../profile.types";
import { NO_READING, gaugeReadings, type GaugeReading, type PartIcon } from "../../setupReadings";
import { PublicGauge } from "./PublicGauge";
import { Icon } from "./PublicPieces";

const PART_ICON_SIZE = 16;

interface PublicBikeSetupProps {
  // Every profile of the bike, the active one first.
  profiles: ProfileSetupProfile[];
  unit: TirePressureUnit;
}

export function PublicBikeSetup({ profiles, unit }: PublicBikeSetupProps): ReactElement | null {
  const { t, i18n } = useTranslation();
  const seededName = useSeededName();
  const [selectedId, setSelectedId] = useState<number | null>(profiles[0]?.id ?? null);

  // A profile deleted under the page falls back to the first one rather than to nothing.
  const profile = profiles.find((item) => item.id === selectedId) ?? profiles[0];
  // No saved profile is no card, not an empty one.
  if (profile === undefined) return null;

  const readings = gaugeReadings(profile, unit, i18n.language, t, seededName);
  const hasLegs = profile.fork !== null || profile.shock !== null;

  return (
    <div id="setup" className="pp-glass mt-8 rounded-2xl p-4 sm:p-5 lg:mt-10">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--pp-card-inset)] text-[var(--pp-gold-500)]">
          <Icon id="i-dial" className="size-[18px]" />
        </span>
        <h2 className="pp-display text-[19px] font-bold tracking-tight">{t("setup.title")}</h2>
        {profile.is_active && (
          <span className="pp-mono rounded-full border border-[var(--pp-gold-500)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--pp-gold-500)]">
            {t("sharing.bikeSetupActive")}
          </span>
        )}
      </div>

      {profiles.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {profiles.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-current={item.id === profile.id}
                onClick={() => setSelectedId(item.id)}
                className="pp-seg pp-mono pp-hairline flex min-h-[40px] items-center rounded-lg border bg-[var(--pp-card-inset)] px-3.5 text-[11px] text-[var(--pp-paper-dim)] transition-colors"
              >
                {item.is_active ? `● ${item.name}` : item.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Two by two: the tyres share a row, so the arcs stand level with a name above or not. */}
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6">
        {readings.map((reading) => (
          <GaugeCell key={reading.key} reading={reading} />
        ))}
      </dl>

      {hasLegs && (
        <details className="pp-hairline mt-4 border-t pt-3">
          <summary className="pp-mono cursor-pointer list-none text-[11px] uppercase tracking-wider text-[var(--pp-paper-dim)] hover:text-[var(--pp-paper)]">
            {t("sharing.tokensAndClicks")}
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {profile.fork !== null && <ClickList label={t("setup.fork")} leg={profile.fork} />}
            {profile.shock !== null && <ClickList label={t("setup.shock")} leg={profile.shock} />}
          </div>
        </details>
      )}
    </div>
  );
}

// The part's own icon - Tire, Fork, Shock - as the rest of the app draws it.
function partMark(part: PartIcon): ReactElement | null {
  const Mark = componentIcon(part);
  return Mark === null ? null : <Mark width={PART_ICON_SIZE} height={PART_ICON_SIZE} />;
}

function GaugeCell({ reading }: { reading: GaugeReading }): ReactElement {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <dt className="pp-mono flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--pp-paper-faint)]">
        {partMark(reading.icon)}
        {reading.label}
      </dt>
      {reading.under !== undefined && (
        <dd className="pp-token mt-1 line-clamp-2 max-w-full text-[13px] leading-snug text-[var(--pp-paper-dim)]">{reading.under}</dd>
      )}
      <dd className="mt-2">
        <PublicGauge value={reading.value} max={reading.max} figure={reading.figure} unit={reading.unit} hint={reading.hint} />
      </dd>
    </div>
  );
}

// One leg's tokens and its four adjusters, counted from fully closed.
function ClickList({ label, leg }: { label: string; leg: ProfileLeg }): ReactElement {
  const { t } = useTranslation();
  const cells: [string, number | null][] = [
    [t("setup.tokens"), leg.tokens],
    [t("sharing.lsr"), leg.clicks.rebound_ls],
    [t("sharing.hsr"), leg.clicks.rebound_hs],
    [t("sharing.lsc"), leg.clicks.compression_ls],
    [t("sharing.hsc"), leg.clicks.compression_hs],
  ];

  return (
    <div>
      <p className="pp-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pp-gold-500)]">{label}</p>
      <dl className="mt-2 grid grid-cols-5 gap-x-3 gap-y-2">
        {cells.map(([name, value]) => (
          <div key={name}>
            <dt className="pp-mono text-[10px] text-[var(--pp-paper-faint)]">{name}</dt>
            <dd className="pp-mono text-[13px] tabular-nums">{value === null ? NO_READING : String(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
