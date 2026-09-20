// The hero of the web bike page, 1:1 the design: the owner row as the way back to the garage,
// the name with the model in gold, the chips, the readings, a CTA per shared section, and the
// photo uncut beside it. The Setup card slots in under the grid.
import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useSeededName } from "@/i18n/useSeededName";
import type { ProfileBike, ProfileBikeResponse, ProfileOwner } from "../../profile.types";
import { publicGaragePath } from "../../publicProfile";
import { Chips, Icon, PhotoBox, PublicAvatar, Reading } from "./PublicPieces";

dayjs.extend(relativeTime);

const MINUTES_PER_HOUR = 60;

interface Cta {
  href: string;
  label: string;
  icon: string | null;
}

// A CTA per section that goes out and has something in it; an empty build has no section.
function heroCtas(bike: ProfileBike, t: (key: string) => string): Cta[] {
  const ctas: Cta[] = [];
  if (bike.components !== null && bike.components.length > 0) {
    ctas.push({ href: "#build", label: t("publicProfile.seeBuild"), icon: null });
  }
  if (bike.history !== null) {
    ctas.push({ href: "#history", label: t("publicProfile.serviceHistory"), icon: "i-wrench" });
  }
  return ctas;
}

// "Jarda L. · @jardal"; the handle alone for an account without a name.
function ownerLabel(owner: ProfileOwner): string {
  return owner.name ? `${owner.name} · @${owner.handle}` : `@${owner.handle}`;
}

interface OwnerRowProps {
  handle: string;
  owner: ProfileOwner;
}

function OwnerRow({ handle, owner }: OwnerRowProps): ReactElement {
  const { t } = useTranslation();

  return (
    <p className="pp-mono flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] uppercase tracking-[0.18em]">
      {/* Padded out and pulled back, so the tap target grows without moving the line. */}
      <Link
        to={publicGaragePath(handle)}
        className="-my-3 flex items-center gap-2 py-3 text-[var(--pp-paper-dim)] transition-colors hover:text-[var(--pp-paper)]"
      >
        <PublicAvatar owner={owner} className="size-5 text-[9px]" />
        <span>{ownerLabel(owner)}</span>
      </Link>
      <span className="text-[var(--pp-paper-faint)]" aria-hidden="true">
        /
      </span>
      <span className="text-[var(--pp-gold-500)]">{t("publicProfile.eyebrow")}</span>
    </p>
  );
}

interface PublicBikeHeroProps {
  // The handle as the reader typed it, so the way back stays on the same cache.
  handle: string;
  page: ProfileBikeResponse;
  // The Setup card, when it goes out.
  children?: ReactNode;
}

export function PublicBikeHero({ handle, page, children }: PublicBikeHeroProps): ReactElement {
  const { t, i18n } = useTranslation();
  const seededName = useSeededName();
  const { owner, bike } = page;

  const title = [bike.brand, bike.model].filter(Boolean).join(" ");
  const type = bike.type === null ? null : seededName(bike.type.i18n_key, bike.type.name);
  // What the owner calls it, then what it is: year, type, frame, e-bike.
  const chips = [bike.name, bike.year === null ? null : String(bike.year), type, bike.frame_material, bike.ebike ? t("addBike.ebike") : null]
    .filter((chip): chip is string => chip !== null && chip !== "");
  const partsCount = bike.components === null ? null : bike.components.reduce((sum, group) => sum + group.parts.length, 0);
  const ctas = heroCtas(bike, t);
  const format = new Intl.NumberFormat(i18n.language);

  return (
    <section className="pp-hairline relative overflow-hidden border-b">
      <div className="relative mx-auto max-w-[1240px] px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12 lg:px-8 lg:pb-16 lg:pt-16">
        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div>
            <OwnerRow handle={handle} owner={owner} />
            <h1 className="pp-display mt-3 text-[34px] font-extrabold leading-[1.05] tracking-tight sm:text-[46px] lg:text-[56px]">
              {bike.brand}
              {bike.model !== null && <span className="block text-[var(--pp-gold-500)]">{bike.model}</span>}
            </h1>
            {chips.length > 0 && (
              <div className="mt-4">
                <Chips items={chips} />
              </div>
            )}
            <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-[var(--pp-paper-dim)] sm:text-base">
              {t("publicProfile.bikeIntro")}
            </p>
            <dl className="mt-7 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
              <Reading label={t("publicProfile.figureBikeDistance")} value={format.format(bike.distance_km)} unit="km" />
              <Reading
                label={t("publicProfile.figureRideTime")}
                value={format.format(Math.round(bike.time_min / MINUTES_PER_HOUR))}
                unit="h"
              />
              {partsCount !== null && <Reading label={t("publicProfile.figureComponents")} value={partsCount} />}
              {bike.services !== null && <Reading label={t("publicProfile.figureServices")} value={bike.services} />}
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
                    {cta.icon !== null && <Icon id={cta.icon} className="size-4 text-[var(--pp-paper-dim)]" />}
                    {cta.label}
                  </a>
                ))}
              </div>
            )}
            <p className="pp-mono mt-5 text-[11px] leading-relaxed text-[var(--pp-paper-faint)]">
              {/* The locale is named here rather than left to dayjs' global, so a switch never renders half-way. */}
              {t("publicProfile.ownerLine", {
                owner: owner.name ?? owner.handle,
                when: dayjs(bike.updated_at).locale(i18n.language).fromNow(),
              })}
            </p>
          </div>
          {/* The whole machine in frame, uncut and unframed; without a photo a framed 16:9 box holds its place. */}
          {bike.image_url ? (
            <img src={bike.image_url} alt={title} loading="eager" decoding="async" className="h-auto w-full" />
          ) : (
            <div className="pp-hairline aspect-[16/9] w-full overflow-hidden rounded-2xl border">
              <PhotoBox imageUrl={null} alt={title} />
            </div>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
