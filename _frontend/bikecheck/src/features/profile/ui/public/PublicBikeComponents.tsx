// The build in the design's rows: each Component Category headed by its icon, a part a row
// of what it is, what the owner called it and how far it has come; a rail to jump by
// category - chips under the header on a phone, a sticky list beside it on a desktop.
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { groupIcon } from "@/assets/icons/svg_icons/groups";
import { positionLabel } from "@/features/components/componentLabels";
import { useSeededName, type SeededRowName } from "@/i18n/useSeededName";
import { formatKm } from "../../profileFormat";
import type { ProfileCatalogueName, ProfileComponentGroup, ProfileMountedPart } from "../../profile.types";
import { Icon } from "./PublicPieces";

// The category's icon is keyed on the seeded English name; a category the app has no icon
// for takes the sprite's generic one.
function categoryMark(category: ProfileCatalogueName, className: string): ReactElement {
  const Mark = groupIcon(category.name);
  return Mark === null ? <Icon id="i-other" className={className} /> : <Mark className={className} />;
}

// "Saddle & Seatpost" -> "cat-saddle-seatpost": the anchor the rails jump to.
function categoryId(category: ProfileCatalogueName): string {
  return `cat-${category.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

interface RailProps {
  groups: ProfileComponentGroup[];
  seededName: SeededRowName;
}

function ChipRail({ groups, seededName }: RailProps): ReactElement {
  const { t } = useTranslation();

  return (
    <nav
      className="pp-hairline sticky top-[65px] z-40 -mx-4 mt-6 border-y bg-[rgba(10,10,11,0.9)] px-4 py-2.5 backdrop-blur-xl lg:hidden"
      aria-label={t("publicProfile.categoriesNav")}
    >
      <ul className="pp-rail flex gap-2 overflow-x-auto">
        {groups.map((group) => (
          <li key={group.category.name}>
            <a
              href={`#${categoryId(group.category)}`}
              className="pp-chip pp-mono pp-hairline flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-lg border bg-[var(--pp-card-inset)] px-3 text-[11px] text-[var(--pp-paper-dim)] transition-colors duration-200"
            >
              {seededName(group.category.i18n_key, group.category.name)}
              <span className="tabular-nums opacity-60">{group.parts.length}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SideRail({ groups, seededName }: RailProps): ReactElement {
  const { t } = useTranslation();

  return (
    <nav className="hidden lg:block" aria-label={t("publicProfile.categoriesNav")}>
      <ul className="pp-hairline sticky top-24 space-y-0.5 border-l">
        {groups.map((group) => (
          <li key={group.category.name}>
            <a
              href={`#${categoryId(group.category)}`}
              className="pp-navlink flex min-h-[44px] items-center gap-2.5 border-l-2 border-transparent px-3 text-[13px] text-[var(--pp-paper-dim)] transition-colors duration-200 hover:text-[var(--pp-paper)]"
            >
              {categoryMark(group.category, "size-4 shrink-0 opacity-70")}
              <span className="min-w-0 flex-1 truncate">{seededName(group.category.i18n_key, group.category.name)}</span>
              <span className="pp-mono text-[10px] tabular-nums opacity-60">{group.parts.length}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function PartRow({ part }: { part: ProfileMountedPart }): ReactElement {
  const { t, i18n } = useTranslation();
  const seededName = useSeededName();
  const type = seededName(part.type.i18n_key, part.type.name);
  const position = positionLabel(part.position, t);
  const described = part.description?.trim();
  // What the owner called it heads the row; a part with no name is headed by its kind.
  const title = described !== undefined && described !== "" ? described : type;
  const eyebrow = [title === type ? null : type, position].filter((item) => item !== null).join(" · ");

  return (
    <div className="pp-part-card flex min-h-[56px] items-center gap-3 rounded-xl px-3 py-2.5 sm:px-4">
      <div className="pp-token min-w-0 flex-1">
        {eyebrow !== "" && (
          <p className="pp-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pp-paper-dim)]">{eyebrow}</p>
        )}
        <p className="mt-0.5 text-[15px] font-semibold leading-snug">{title}</p>
      </div>
      <p className="pp-mono shrink-0 text-[11px] tabular-nums text-[var(--pp-paper-dim)]">
        {part.distance_km === null ? t("sharing.sinceNew") : formatKm(part.distance_km, i18n.language)}
      </p>
    </div>
  );
}

function CategoryBlock({ group }: { group: ProfileComponentGroup }): ReactElement {
  const seededName = useSeededName();

  return (
    <section id={categoryId(group.category)} className="scroll-mt-32 lg:scroll-mt-24">
      <div className="pp-hairline flex items-center gap-3 border-b pb-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--pp-card-inset)] text-[var(--pp-gold-500)]">
          {categoryMark(group.category, "size-[18px]")}
        </span>
        <h3 className="pp-display text-[19px] font-bold tracking-tight sm:text-[21px]">
          {seededName(group.category.i18n_key, group.category.name)}
        </h3>
        <span className="pp-mono ml-auto text-[11px] tabular-nums text-[var(--pp-paper-dim)]">{group.parts.length}</span>
      </div>
      <div className="mt-3 space-y-1.5">
        {group.parts.map((part) => (
          <PartRow key={part.id} part={part} />
        ))}
      </div>
    </section>
  );
}

interface PublicBikeComponentsProps {
  groups: ProfileComponentGroup[];
}

export function PublicBikeComponents({ groups }: PublicBikeComponentsProps): ReactElement | null {
  const { t } = useTranslation();
  const seededName = useSeededName();

  // An empty build has nothing to read; the hero's count already says so.
  if (groups.length === 0) return null;
  const total = groups.reduce((sum, group) => sum + group.parts.length, 0);

  return (
    <section id="build" className="relative scroll-mt-32 overflow-hidden">
      <div className="relative mx-auto max-w-[1240px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div>
          <h2 className="pp-display text-[26px] font-extrabold tracking-tight sm:text-[34px]">
            {t("sharing.bikeComponentsTitle")}
          </h2>
          <p className="mt-2 max-w-[56ch] text-[15px] text-[var(--pp-paper-dim)]">
            {t("publicProfile.buildIntro", {
              parts: t("sharing.partsCount", { count: total }),
              categories: t("publicProfile.categoriesCount", { count: groups.length }),
            })}
          </p>
        </div>
        <ChipRail groups={groups} seededName={seededName} />
        <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[210px_1fr] lg:gap-10">
          <SideRail groups={groups} seededName={seededName} />
          <div className="min-w-0 space-y-10">
            {groups.map((group) => (
              <CategoryBlock key={group.category.name} group={group} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
