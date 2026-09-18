// PROTOTYPE #129 — throwaway. Somebody's garage at /users/:handle (#126). The header only
// names the kind of page - the body names the owner - and the body is whichever variant
// the switcher holds, or the one 404 screen.
import { useEffect, type ReactElement } from "react";
import { Text } from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";
import { useHeaderStore } from "@/store/store";
import { useProfileView } from "./profile.model";
import { ProfileUnavailable } from "./ProfileShared";
import { ProfileVariantCard } from "./ProfileVariantCard";
import { ProfileVariantHero } from "./ProfileVariantHero";
import { ProfileVariantPanels } from "./ProfileVariantPanels";
import { usePrototypeStore } from "./prototype.store";

export function UserProfile(): ReactElement {
  const { handle = "" } = useParams();
  const navigate = useNavigate();
  const view = useProfileView(handle);
  const variant = usePrototypeStore((state) => state.variant);
  const setTitleSlot = useHeaderStore((state) => state.setTitleSlot);

  useEffect(() => {
    setTitleSlot(
      <Text fw={700} size="lg" c="text.6">
        Profil uživatele
      </Text>,
    );
    return () => setTitleSlot(null);
  }, [setTitleSlot]);

  if (view.kind === "missing") return <ProfileUnavailable />;

  const openBike = (id: number): void => {
    void navigate(`/users/${handle}/${String(id)}`);
  };

  if (variant === "1") return <ProfileVariantHero view={view} openBike={openBike} />;
  if (variant === "2") return <ProfileVariantPanels view={view} openBike={openBike} />;
  return <ProfileVariantCard view={view} openBike={openBike} />;
}
