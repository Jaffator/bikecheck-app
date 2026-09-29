// Somebody's garage at /users/:handle, drawn natively inside the shell - and my own, the way
// others see it. The header names the kind of page; the hero names the owner.
import { useState, type ReactElement } from "react";
import { Center, Loader, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useProfileGarage } from "@/features/profile/profile.queries";
import { ProfileLocked } from "@/features/profile/ui/ProfileLocked";
import { ShareDrawer } from "@/features/profile/ui/ShareDrawer";
import { UserProfileBikeCard } from "@/features/profile/ui/UserProfileBikeCard";
import { UserProfileHero } from "@/features/profile/ui/UserProfileHero";
import { ProfileUnavailable } from "./ProfileUnavailable";

const NOT_FOUND_STATUS = 404;

export function UserProfile(): ReactElement {
  const { t } = useTranslation();
  const { handle = "" } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const { data: page, isLoading, error } = useProfileGarage(handle);
  const [sharing, setSharing] = useState(false);

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader type="oval" color="primary.6" />
      </Center>
    );
  }

  if (error?.status === NOT_FOUND_STATUS) return <ProfileUnavailable />;

  if (!page) {
    return (
      <Text fz={13} c="var(--color-text-dim)" ta="center" pt="xl" px="xl">
        {t("sharing.loadFailed")}
      </Text>
    );
  }

  const mine = page.relation === "SELF";

  return (
    <Stack gap="md" px={8} pt="md" pb="calc(2rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
      {/* My own preview while nobody else can open it. */}
      {mine && page.visibility === "OFF" && (
        <Text fz={13} c="var(--color-text-dim)" ta="center" style={{ lineHeight: 1.45 }}>
          {t("sharing.offNotice")}
        </Text>
      )}

      <UserProfileHero page={page} onOpenSharing={mine ? () => setSharing(true) : undefined} />

      {page.garage === null && <ProfileLocked handle={page.owner.handle} relation={page.relation} />}

      {page.garage?.bikes.map((bike) => (
        <UserProfileBikeCard key={bike.id} bike={bike} onOpen={() => void navigate(`/users/${handle}/${String(bike.id)}`)} />
      ))}
      {page.garage?.bikes.length === 0 && (
        <Text fz={13} c="var(--color-text-dim)" ta="center">
          {t("sharing.noBikes")}
        </Text>
      )}

      {mine && <ShareDrawer opened={sharing} onClose={() => setSharing(false)} />}
    </Stack>
  );
}
