// The web garage: the hero with the owner and the numbers the listed bikes add up to, then a
// grid of bike cards. Everything reads in the page language; the units are the owner's.
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useSeededName } from "@/i18n/useSeededName";
import { bikeStatsLine } from "../../profileFormat";
import { publicBikePath } from "../../publicProfile";
import type { ProfileBikeCard, ProfileGarage, ProfileOwner, PublicProfileGarageResponse } from "../../profile.types";
import { Chips, Icon, PhotoBox, PublicAvatar, Reading } from "./PublicPieces";

dayjs.extend(relativeTime);

interface GarageHeroProps {
  owner: ProfileOwner;
  garage: ProfileGarage;
}

function GarageHero({ owner, garage }: GarageHeroProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { totals } = garage;

  return (
    <section className="pp-hairline border-b">
      <div className="mx-auto max-w-[1240px] px-4 pb-10 pt-8 sm:px-6 sm:pb-12 sm:pt-12 lg:px-8">
        <p className="pp-mono flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] uppercase tracking-[0.18em] text-[var(--pp-gold-500)]">
          BikeCheck
          <span className="text-[var(--pp-paper-faint)]" aria-hidden="true">
            /
          </span>
          <span className="text-[var(--pp-paper-faint)]">{t("publicProfile.eyebrow")}</span>
        </p>
        <div className="mt-4 flex items-center gap-4">
          <PublicAvatar owner={owner} className="size-14 text-[20px] sm:size-16 sm:text-[22px]" />
          <div className="min-w-0">
            <h1 className="pp-display text-[30px] font-extrabold leading-[1.05] tracking-tight sm:text-[40px]">
              {owner.name ?? owner.handle}
            </h1>
            <p className="pp-mono mt-1 text-[12px] text-[var(--pp-paper-dim)]">
              {window.location.host}/u/{owner.handle}
            </p>
          </div>
        </div>
        <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-[var(--pp-paper-dim)] sm:text-base">
          {t("publicProfile.garageIntro")}
        </p>
        <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-5">
          <Reading label={t("publicProfile.figureBikes")} value={totals.bikes} />
          <Reading
            label={t("publicProfile.figureDistance")}
            value={new Intl.NumberFormat(i18n.language).format(totals.distance_km)}
            unit="km"
          />
          {totals.components !== null && <Reading label={t("publicProfile.figureComponents")} value={totals.components} />}
          {totals.services !== null && <Reading label={t("publicProfile.figureServices")} value={totals.services} />}
        </dl>
        <p className="pp-mono mt-5 text-[11px] leading-relaxed text-[var(--pp-paper-faint)]">
          {/* The locale is named here rather than left to dayjs' global, so a switch never renders half-way. */}
          {t("publicProfile.updated", { when: dayjs(garage.updated_at).locale(i18n.language).fromNow() })}
        </p>
      </div>
    </section>
  );
}

interface BikeCardProps {
  handle: string;
  bike: ProfileBikeCard;
}

function BikeCard({ handle, bike }: BikeCardProps): ReactElement {
  const { t, i18n } = useTranslation();
  const seededName = useSeededName();

  const type = bike.type === null ? null : seededName(bike.type.i18n_key, bike.type.name);
  const chips = [bike.year === null ? null : String(bike.year), type].filter((chip): chip is string => chip !== null);
  const title = [bike.brand, bike.model].filter(Boolean).join(" ");

  return (
    <Link to={publicBikePath(handle, bike.id)} className="pp-bike-card group block overflow-hidden rounded-xl">
      <div className="pp-hairline aspect-[16/10] w-full overflow-hidden border-b bg-[var(--pp-card-inset)]">
        <PhotoBox imageUrl={bike.image_url} alt={title} />
      </div>
      <div className="p-4">
        <p className="pp-display text-[19px] font-bold leading-tight tracking-tight">
          {bike.brand} {bike.model !== null && <span className="text-[var(--pp-gold-500)]">{bike.model}</span>}
        </p>
        {chips.length > 0 && (
          <div className="mt-2.5">
            <Chips items={chips} />
          </div>
        )}
        <p className="pp-mono mt-4 flex items-center gap-2 text-[11px] tabular-nums text-[var(--pp-paper-dim)]">
          <span className="min-w-0 flex-1">{bikeStatsLine(bike, i18n.language, t)}</span>
          <Icon
            id="i-arrow"
            className="size-4 shrink-0 text-[var(--pp-paper-faint)] transition-colors group-hover:text-[var(--pp-gold-500)]"
          />
        </p>
      </div>
    </Link>
  );
}

interface PublicGarageProps {
  // The handle as the reader typed it, so the bike links stay on the same cache.
  handle: string;
  page: PublicProfileGarageResponse;
}

export function PublicGarage({ handle, page }: PublicGarageProps): ReactElement {
  const { t } = useTranslation();
  const { owner, garage } = page;

  return (
    <>
      <GarageHero owner={owner} garage={garage} />
      <section>
        <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="pp-display text-[26px] font-extrabold tracking-tight sm:text-[34px]">{t("publicProfile.bikes")}</h2>
            <p className="pp-mono text-[12px] tabular-nums text-[var(--pp-paper-dim)]">{garage.bikes.length}</p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {garage.bikes.map((bike) => (
              <BikeCard key={bike.id} handle={handle} bike={bike} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
