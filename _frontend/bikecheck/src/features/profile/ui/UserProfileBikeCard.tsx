// One of somebody's bikes on their garage page: the photo card the garage draws, minus
// everything that is the owner's business - health, attention, Strava, actions. One mono
// line of numbers and a chevron into the bike.
import type { ReactElement } from "react";
import { Box, Group, Paper, Text } from "@mantine/core";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BikePhoto } from "@/features/bikes/ui/BikePhoto";
import { useSeededName } from "@/i18n/useSeededName";
import { bikeStatsLine } from "../profileFormat";
import type { ProfileBikeCard } from "../profile.types";

interface UserProfileBikeCardProps {
  bike: ProfileBikeCard;
  onOpen: () => void;
}

export function UserProfileBikeCard({ bike, onOpen }: UserProfileBikeCardProps): ReactElement {
  const { t, i18n } = useTranslation();
  const seededName = useSeededName();

  // What the bike is on the photo; what its owner calls it, the year and the type under it.
  const title = [bike.brand, bike.model].filter(Boolean).join(" ");
  const type = bike.type === null ? null : seededName(bike.type.i18n_key, bike.type.name);
  const subtitle = [bike.name, bike.year, type].filter(Boolean).join(" · ");

  return (
    <Paper
      radius="lg"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        // Space would scroll the page instead of opening the bike.
        event.preventDefault();
        onOpen();
      }}
      className="active:scale-[0.985]"
      style={{
        overflow: "hidden",
        backgroundColor: "var(--mantine-color-cards-6)",
        border: "1px solid var(--mantine-color-cards-5)",
        boxShadow: "var(--elev-hero)",
        transition: "transform 0.12s ease",
        cursor: "pointer",
      }}
    >
      <BikePhoto imageUrl={bike.image_url} title={title} subtitle={subtitle} titleSize={20} />
      <Group justify="space-between" wrap="nowrap" px="md" py="sm">
        <Text className="font-mono" fz={13} tt="uppercase" c="text.6" lts="0.02em" lineClamp={1}>
          {bikeStatsLine(bike, i18n.language, t)}
        </Text>
        <Box style={{ display: "flex", flexShrink: 0 }}>
          <ChevronRight size={16} color="var(--color-text-dim)" />
        </Box>
      </Group>
    </Paper>
  );
}
