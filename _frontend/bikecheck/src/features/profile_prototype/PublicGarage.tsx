// PROTOTYPE #132 — throwaway. The web garage /u/<handle>, #120 variant A: hero with the
// owner and the four numbers, then a grid of bike cards. Outside the auth shell, like
// /r/:token. Dev builds only.
import type { ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import type { MockBike, MockGarage } from "./profile.mock";
import { COPY, pick, updatedLabel, usePublicLang, type PublicLang } from "./publicProfile.copy";
import { bikePath, usePublicView, type PublicOwner } from "./publicProfile.model";
import { BikeStats, Chips, PhotoBox, Reading } from "./PublicPieces";
import { formatNumber, garageTotals } from "./publicProfile.format";
import { PublicProfileClosed } from "./PublicProfileClosed";
import { Avatar, Icon, PublicShell } from "./PublicShell";

function GarageHero({
  lang,
  owner,
  garage,
}: {
  lang: PublicLang;
  owner: PublicOwner;
  garage: MockGarage;
}): ReactElement {
  const totals = garageTotals(garage);
  return (
    <section className="pp-hairline border-b">
      <div className="mx-auto max-w-[1240px] px-4 pb-10 pt-8 sm:px-6 sm:pb-12 sm:pt-12 lg:px-8">
        <p className="pp-mono flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] uppercase tracking-[0.18em] text-[var(--pp-gold-500)]">
          BikeCheck
          <span className="text-[var(--pp-paper-faint)]" aria-hidden="true">
            /
          </span>
          <span className="text-[var(--pp-paper-faint)]">{pick(lang, COPY.publicProfile)}</span>
        </p>
        <div className="mt-4 flex items-center gap-4">
          <Avatar owner={owner} className="size-14 text-[20px] sm:size-16 sm:text-[22px]" />
          <div className="min-w-0">
            <h1 className="pp-display text-[30px] font-extrabold leading-[1.05] tracking-tight sm:text-[40px]">
              {owner.name}
            </h1>
            <p className="pp-mono mt-1 text-[12px] text-[var(--pp-paper-dim)]">
              {window.location.host}/u/{owner.handle}
            </p>
          </div>
        </div>
        <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-[var(--pp-paper-dim)] sm:text-base">
          {pick(lang, COPY.garageIntro)}
        </p>
        <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-5">
          <Reading label={pick(lang, COPY.bikesCount)} value={totals.bikes} />
          <Reading label={pick(lang, COPY.totalDistance)} value={formatNumber(lang, totals.km)} unit="km" />
          {garage.sections.components && <Reading label={pick(lang, COPY.components)} value={totals.parts} />}
          {garage.sections.history && <Reading label={pick(lang, COPY.services)} value={totals.services} />}
        </dl>
        <p className="pp-mono mt-5 text-[11px] leading-relaxed text-[var(--pp-paper-faint)]">
          {pick(lang, COPY.updated)} {updatedLabel(lang, garage.updated)}
        </p>
      </div>
    </section>
  );
}

function BikeCard({
  lang,
  owner,
  garage,
  bike,
}: {
  lang: PublicLang;
  owner: PublicOwner;
  garage: MockGarage;
  bike: MockBike;
}): ReactElement {
  return (
    <Link to={bikePath(owner.handle, bike.id)} className="pp-bike-card group block overflow-hidden rounded-xl">
      <div className="pp-hairline aspect-[16/10] w-full overflow-hidden border-b bg-[var(--pp-card-inset)]">
        <PhotoBox lang={lang} bike={bike} />
      </div>
      <div className="p-4">
        <p className="pp-display text-[19px] font-bold leading-tight tracking-tight">
          {bike.name} <span className="text-[var(--pp-gold-500)]">{bike.model}</span>
        </p>
        <div className="mt-2.5">
          <Chips lang={lang} items={bike.chips.slice(0, 2)} />
        </div>
        <p className="pp-mono mt-4 flex items-center gap-2 text-[11px] tabular-nums text-[var(--pp-paper-dim)]">
          <span className="min-w-0 flex-1">
            <BikeStats lang={lang} garage={garage} bike={bike} />
          </span>
          <Icon
            id="i-arrow"
            className="size-4 shrink-0 text-[var(--pp-paper-faint)] transition-colors group-hover:text-[var(--pp-gold-500)]"
          />
        </p>
      </div>
    </Link>
  );
}

export function PublicGarage(): ReactElement | null {
  const { handle = "" } = useParams<{ handle: string }>();
  const { lang, toggle } = usePublicLang();
  const view = usePublicView(handle);

  if (!import.meta.env.DEV) return null;

  if (view.kind === "closed") {
    return <PublicProfileClosed handle={handle} lang={lang} onToggleLang={toggle} />;
  }

  const { owner, garage } = view;
  return (
    <PublicShell lang={lang} onToggleLang={toggle} handle={handle} title={owner.name}>
      <GarageHero lang={lang} owner={owner} garage={garage} />
      <section>
        <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="pp-display text-[26px] font-extrabold tracking-tight sm:text-[34px]">
              {pick(lang, COPY.bikes)}
            </h2>
            <p className="pp-mono text-[12px] tabular-nums text-[var(--pp-paper-dim)]">{garage.bikes.length}</p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {garage.bikes.map((bike) => (
              <BikeCard key={bike.id} lang={lang} owner={owner} garage={garage} bike={bike} />
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
