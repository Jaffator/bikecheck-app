// One of somebody's bikes at /users/:handle/:bikeId, read as the machine: the hero, then
// Setup and the build only where the owner shares them. The header steps off the photo and
// names the owner as the way back to their garage.
import { useEffect, type ReactElement } from "react";
import { Center, Loader, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useProfileBike } from "@/features/profile/profile.queries";
import { UserBikeComponents } from "@/features/profile/ui/bike/UserBikeComponents";
import { UserBikeHero } from "@/features/profile/ui/bike/UserBikeHero";
import { UserBikeOwnerPill } from "@/features/profile/ui/bike/UserBikeOwnerPill";
import { UserBikeSetup } from "@/features/profile/ui/bike/UserBikeSetup";
import { useHeaderStore } from "@/store/store";
import { ProfileUnavailable } from "./ProfileUnavailable";

const NOT_FOUND_STATUS = 404;

export function UserProfileBike(): ReactElement {
  const { t } = useTranslation();
  const { handle = "", bikeId = "" } = useParams<{ handle: string; bikeId: string }>();
  const navigate = useNavigate();
  const id = Number(bikeId);
  const { data: page, isLoading, error } = useProfileBike(handle, id);
  const setTitleSlot = useHeaderStore((state) => state.setTitleSlot);
  const setHeaderTransparent = useHeaderStore((state) => state.setHeaderTransparent);
  const owner = page?.owner;

  // Once the bike is here the page leads with its photo, so the header steps out of the way
  // and carries the owner instead of a title.
  useEffect(() => {
    if (owner === undefined) return;
    setHeaderTransparent(true);
    setTitleSlot(<UserBikeOwnerPill owner={owner} onClick={() => void navigate(`/users/${handle}`)} />);
    return () => {
      setTitleSlot(null);
      setHeaderTransparent(false);
    };
  }, [owner, handle, navigate, setTitleSlot, setHeaderTransparent]);

  if (!Number.isInteger(id) || error?.status === NOT_FOUND_STATUS) return <ProfileUnavailable />;

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader type="oval" color="primary.6" />
      </Center>
    );
  }

  if (!page) {
    return (
      <Text fz={13} c="var(--color-text-dim)" ta="center" pt="xl" px="xl">
        {t("sharing.loadFailed")}
      </Text>
    );
  }

  const { bike } = page;

  return (
    <Stack
      gap="md"
      px={8}
      // Clears the transparent header, which no longer holds a place open for the page.
      pt="calc(3.5rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 0.4rem)"
      pb="calc(2rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))"
    >
      {/* My own preview while nobody else can open it. */}
      {page.relation === "SELF" && page.visibility === "OFF" && (
        <Text fz={13} c="var(--color-text-dim)" ta="center" style={{ lineHeight: 1.45 }}>
          {t("sharing.offNotice")}
        </Text>
      )}

      <UserBikeHero bike={bike} />

      {/* A section that is off is null and absent; nothing shared leaves the hero alone. */}
      {bike.setup !== null && <UserBikeSetup profiles={bike.setup} unit={page.tire_pressure_unit} />}
      {bike.components !== null && <UserBikeComponents groups={bike.components} />}
    </Stack>
  );
}
