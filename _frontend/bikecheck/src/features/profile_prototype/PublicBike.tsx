// PROTOTYPE #132 — throwaway. The web bike page /u/<handle>/<id>: the design's hero 1:1
// with the owner row above the H1 as the way back (#120), the Setup card under the hero
// grid, then the build and the history — each only while its switch is on.
import type { ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import type { MockBike, MockGarage } from "./profile.mock";
import { partCount } from "./profile.mock";
import { COPY, pick, updatedLabel, usePublicLang, type PublicLang } from "./publicProfile.copy";
import { garagePath, usePublicBikeView, type PublicOwner } from "./publicProfile.model";
import { BuildSection, HistorySection, SetupCard } from "./PublicBikeSections";
import { Chips, PhotoBox, Reading } from "./PublicPieces";
import { formatNumber } from "./publicProfile.format";
import { PublicProfileClosed } from "./PublicProfileClosed";
import { Avatar, Icon, PublicShell } from "./PublicShell";

interface HeroProps {
  lang: PublicLang;
  owner: PublicOwner;
  garage: MockGarage;
  bike: MockBike;
}

function BikeHero({ lang, owner, garage, bike }: HeroProps): ReactElement {
  const ctas: { href: string; label: string; icon: string | null }[] = [];
  if (garage.sections.components)
    ctas.push({
      href: "#osazeni",
      label: pick(lang, COPY.seeBuild),
      icon: null,
    });
  if (garage.sections.history)
    ctas.push({
      href: "#servis",
      label: pick(lang, COPY.serviceHistory),
      icon: "i-wrench",
    });

  return (
    <section className="pp-hairline relative overflow-hidden border-b">
      <div className="relative mx-auto max-w-[1240px] px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12 lg:px-8 lg:pb-16 lg:pt-16">
        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div>
            <p className="pp-mono flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] uppercase tracking-[0.18em]">
              <Link
                to={garagePath(owner.handle)}
                className="flex items-center gap-2 text-[var(--pp-paper-dim)] transition-colors hover:text-[var(--pp-paper)]"
              >
                <Avatar owner={owner} className="size-5 text-[9px]" />
                <span>
                  {owner.name} · @{owner.handle}
                </span>
              </Link>
              <span className="text-[var(--pp-paper-faint)]" aria-hidden="true">
                /
              </span>
              <span className="text-[var(--pp-gold-500)]">{pick(lang, COPY.publicProfile)}</span>
            </p>
            <h1 className="pp-display mt-3 text-[34px] font-extrabold leading-[1.05] tracking-tight sm:text-[46px] lg:text-[56px]">
              {bike.name}
              <span className="block text-[var(--pp-gold-500)]">{bike.model}</span>
            </h1>
            <div className="mt-4">
              <Chips lang={lang} items={bike.chips} />
            </div>
            <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-[var(--pp-paper-dim)] sm:text-base">
              {pick(lang, COPY.bikeIntro)}
            </p>
            <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-5">
              <Reading label={pick(lang, COPY.distance)} value={formatNumber(lang, bike.km)} unit="km" />
              <Reading label={pick(lang, COPY.rideTime)} value={bike.hours} unit="h" />
              {garage.sections.components && <Reading label={pick(lang, COPY.components)} value={partCount(bike)} />}
              {garage.sections.history && <Reading label={pick(lang, COPY.services)} value={bike.services.length} />}
            </dl>
            {ctas.length > 0 && (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                {ctas.map((cta, index) => (
                  <a
                    key={cta.href}
                    href={cta.href}
                    className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 text-[15px] transition-colors duration-200 ${
                      index === 0
                        ? "bg-[var(--pp-gold-500)] font-semibold text-[var(--pp-dark)] hover:bg-[var(--pp-gold-400)]"
                        : "pp-hairline-strong border font-medium text-[var(--pp-paper)] hover:border-[rgba(206,192,83,0.4)]"
                    }`}
                  >
                    {cta.icon && <Icon id={cta.icon} className="size-4 text-[var(--pp-paper-dim)]" />}
                    {cta.label}
                  </a>
                ))}
              </div>
            )}
            <p className="pp-mono mt-5 text-[11px] leading-relaxed text-[var(--pp-paper-faint)]">
              {pick(lang, COPY.owner)}: {owner.name} · {pick(lang, COPY.updatedLower)}{" "}
              {updatedLabel(lang, garage.updated)}
            </p>
          </div>
          {bike.photo ? (
            <img
              src={bike.photo}
              alt={`${bike.name} ${bike.model}`}
              loading="eager"
              decoding="async"
              className="h-auto w-full"
            />
          ) : (
            <div className="pp-hairline aspect-[16/9] w-full overflow-hidden rounded-2xl border">
              <PhotoBox lang={lang} bike={bike} />
            </div>
          )}
        </div>
        <SetupCard lang={lang} garage={garage} bike={bike} />
      </div>
    </section>
  );
}

export function PublicBike(): ReactElement | null {
  const { handle = "", bikeId = "" } = useParams<{
    handle: string;
    bikeId: string;
  }>();
  const { lang, toggle } = usePublicLang();
  const view = usePublicBikeView(handle, Number(bikeId));

  if (!import.meta.env.DEV) return null;

  if (view.kind === "closed") {
    return <PublicProfileClosed handle={handle} lang={lang} onToggleLang={toggle} />;
  }

  const { owner, garage, bike } = view;
  return (
    <PublicShell lang={lang} onToggleLang={toggle} handle={handle} title={`${bike.name} ${bike.model}`}>
      <BikeHero lang={lang} owner={owner} garage={garage} bike={bike} />
      {garage.sections.components && <BuildSection lang={lang} bike={bike} />}
      {garage.sections.history && <HistorySection lang={lang} garage={garage} bike={bike} />}
    </PublicShell>
  );
}
