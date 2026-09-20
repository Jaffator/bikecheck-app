// One of somebody's bikes at /u/:handle/:bikeId, the way a link in a chat opens it: outside
// the app shell, no session, the design's own look. The hero always; Setup, the build and
// the history only where the owner shares them. Whatever the web rule closes is one plain page.
import type { ReactElement } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePublicProfileBike } from "@/features/profile/profile.queries";
import { PublicBikeComponents } from "@/features/profile/ui/public/PublicBikeComponents";
import { PublicBikeHero } from "@/features/profile/ui/public/PublicBikeHero";
import { PublicBikeHistory } from "@/features/profile/ui/public/PublicBikeHistory";
import { PublicBikeSetup } from "@/features/profile/ui/public/PublicBikeSetup";
import { PublicClosed } from "@/features/profile/ui/public/PublicClosed";
import { PublicLoadFailed, PublicLoading } from "@/features/profile/ui/public/PublicPieces";
import { PublicShell } from "@/features/profile/ui/public/PublicShell";

const NOT_FOUND_STATUS = 404;

export function PublicProfileBike(): ReactElement {
  const { t } = useTranslation();
  const { handle = "", bikeId = "" } = useParams<{ handle: string; bikeId: string }>();
  const id = Number(bikeId);
  const { data: page, isLoading, error } = usePublicProfileBike(handle, id);

  // An address that is not a bike's reads as a bike nobody may see: the same closed page.
  if (!Number.isInteger(id) || error?.status === NOT_FOUND_STATUS) {
    return (
      <PublicShell handle={handle} title={t("publicProfile.closedTitle")} live={false}>
        <PublicClosed />
      </PublicShell>
    );
  }

  if (isLoading) {
    return (
      <PublicShell handle={handle} title={t("publicProfile.title")} live={false}>
        <PublicLoading />
      </PublicShell>
    );
  }

  if (!page) {
    return (
      <PublicShell handle={handle} title={t("publicProfile.title")} live={false}>
        <PublicLoadFailed />
      </PublicShell>
    );
  }

  const { bike } = page;
  const title = [bike.brand, bike.model].filter(Boolean).join(" ");

  return (
    <PublicShell handle={handle} title={title} live>
      <PublicBikeHero handle={handle} page={page}>
        {bike.setup !== null && <PublicBikeSetup profiles={bike.setup} unit={page.tire_pressure_unit} />}
      </PublicBikeHero>
      {/* A section that is off is null and absent; nothing shared leaves the hero alone. */}
      {bike.components !== null && <PublicBikeComponents groups={bike.components} />}
      {bike.history !== null && <PublicBikeHistory handle={handle} bikeId={id} history={bike.history} />}
    </PublicShell>
  );
}
