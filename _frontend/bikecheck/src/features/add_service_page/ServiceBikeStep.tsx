// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Box, Group, Image, Loader, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Gauge } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import type { Bike } from "@/features/bikes/bikes.types";

// Keeps the row compact next to the garage's full-width photo cards.
const PHOTO_SIZE = 64;

interface ServiceBikeStepProps {
  bikes: Bike[] | undefined;
  isLoading: boolean;
  onChoose: (bikeId: number) => void;
}

// Which bike was worked on. Shown only to an owner of several — see the wizard hook.
export function ServiceBikeStep({ bikes, isLoading, onChoose }: ServiceBikeStepProps): ReactElement {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Group justify="center" p="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  return (
    <Stack gap="sm">
      <Text fw={600} fz={15} c="text.6">
        {t("addService.bikeTitle")}
      </Text>

      {bikes?.map((bike) => (
        <BikeTile key={bike.id} bike={bike} onChoose={() => onChoose(bike.id)} />
      ))}
    </Stack>
  );
}

// One bike, recognisable the same way the garage shows it.
function BikeTile({ bike, onChoose }: { bike: Bike; onChoose: () => void }): ReactElement {
  const { t } = useTranslation();
  const title = bike.bikename ?? bike.bike_model ?? bike.bike_brand;

  return (
    <UnstyledButton
      onClick={() => {
        void tapFeedback();
        onChoose();
      }}
      style={{ display: "block", width: "100%", textAlign: "left" }}
    >
      <Paper
        radius="lg"
        p="sm"
        style={{
          // Colour, glow and inner edge all live in this one object: `bg` would emit the
          // `background` shorthand and wipe the gradient - see docs/ui/card-surface.md.
          backgroundColor: "var(--mantine-color-cards-6)",
          backgroundImage:
            "radial-gradient(90% 120% at 0% 0%, color-mix(in srgb, var(--mantine-color-primary-6) 7%, transparent) 0%, transparent 45%)",
          border: "1px solid var(--color-border-subtle)",
          boxShadow:
            "inset 0 1px 0 0 rgba(255, 255, 255, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.35), 0 8px 16px -6px rgba(0, 0, 0, 0.5)",
        }}
        className="active:scale-[0.985]"
      >
        <Group gap="md" wrap="nowrap">
          {bike.image_url ? (
            <Image
              src={bike.image_url}
              alt={title}
              w={PHOTO_SIZE}
              h={PHOTO_SIZE}
              fit="cover"
              radius="md"
              style={{ flexShrink: 0, backgroundColor: "#FFFFFF" }}
            />
          ) : (
            // Keeps the row height steady for a bike with no photo.
            <Box
              w={PHOTO_SIZE}
              h={PHOTO_SIZE}
              bg="cards.7"
              style={{ flexShrink: 0, borderRadius: "var(--mantine-radius-md)" }}
              className="flex items-center justify-center"
            >
              <Gauge size={24} color="var(--mantine-color-text-9)" />
            </Box>
          )}

          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text fw={600} fz={16} c="text.6" lineClamp={1}>
              {title}
            </Text>
            <Text className="font-mono" fz={11} tt="uppercase" c="var(--color-text-dim)">
              {bike.bike_brand}
            </Text>
            <Text fz={13} c="var(--color-text-dim)">
              {t("bikes.kilometres", { count: bike.total_km ?? 0 })}
            </Text>
          </Stack>
        </Group>
      </Paper>
    </UnstyledButton>
  );
}
