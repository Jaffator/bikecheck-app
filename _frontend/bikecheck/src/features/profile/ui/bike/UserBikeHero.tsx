// One of somebody's bikes as a hero card: the bare photo, the name, one mono line of what
// it is, and the readings - distance and saddle time always, parts and Services only while
// the owner shares those sections.
import type { ReactElement } from "react";
import { Group, Paper, Stack, Text } from "@mantine/core";
import { Clock, Gauge, Wrench } from "lucide-react";
import { IoLogoWebComponent } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { BikePhoto } from "@/features/bikes/ui/BikePhoto";
import { useSeededName } from "@/i18n/useSeededName";
import { formatKm } from "../../profileFormat";
import type { ProfileBike } from "../../profile.types";

const METRIC_ICON_SIZE = 14;
const METRIC_COLOR = "var(--mantine-color-text-8)";

interface UserBikeHeroProps {
  bike: ProfileBike;
}

export function UserBikeHero({ bike }: UserBikeHeroProps): ReactElement {
  const { t, i18n } = useTranslation();
  const seededName = useSeededName();

  const title = [bike.brand, bike.model].filter(Boolean).join(" ");
  const type = bike.type === null ? null : seededName(bike.type.i18n_key, bike.type.name);
  // What the owner calls it, then what it is: year, type, frame, e-bike.
  const chips = [bike.name, bike.year, type, bike.frame_material, bike.ebike ? t("addBike.ebike") : null]
    .filter(Boolean)
    .join(" · ");
  const partsCount = bike.components === null ? null : bike.components.reduce((sum, group) => sum + group.parts.length, 0);

  return (
    <Paper
      radius="lg"
      style={{
        overflow: "hidden",
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage: "var(--card-glow)",
        border: "none",
        boxShadow: "var(--elev-hero)",
      }}
    >
      <BikePhoto imageUrl={bike.image_url} title={title} subtitle={null} titleSize={24} showCaption={false} />

      <Stack gap={8} p="md">
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text fw={700} fz={24} c="text.6" lh={1.2} lineClamp={1}>
            {title}
          </Text>
          {chips !== "" && (
            <Text className="font-mono" fz={11} tt="uppercase" c="var(--color-text-dim)" lineClamp={1}>
              {chips}
            </Text>
          )}
        </Stack>

        <Group gap="md" wrap="wrap">
          <Metric icon={<Gauge size={METRIC_ICON_SIZE} color={METRIC_COLOR} />} value={formatKm(bike.distance_km, i18n.language)} />
          <Metric
            icon={<Clock size={METRIC_ICON_SIZE} color={METRIC_COLOR} />}
            value={t("bikes.hours", { count: Math.round(bike.time_min / 60) })}
          />
          {partsCount !== null && (
            <Metric
              icon={<IoLogoWebComponent size={METRIC_ICON_SIZE} color={METRIC_COLOR} />}
              value={t("sharing.partsCount", { count: partsCount })}
            />
          )}
          {bike.services !== null && (
            <Metric
              icon={<Wrench size={METRIC_ICON_SIZE} color={METRIC_COLOR} />}
              value={t("sharing.servicesCount", { count: bike.services })}
            />
          )}
        </Group>
      </Stack>
    </Paper>
  );
}

function Metric({ icon, value }: { icon: ReactElement; value: string }): ReactElement {
  return (
    <Group gap={6} wrap="nowrap">
      {icon}
      <Text className="font-mono" fz={13} c="text.6" lineClamp={1}>
        {value}
      </Text>
    </Group>
  );
}
