// The ride's AI review: asked for when the detail opens, left out when it cannot be had.
import type { ReactElement } from "react";
import { Box, Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Eyebrow } from "@/components/Eyebrow";
import type { RideItem } from "@/features/rides/rideDetail";
import { useRideAiSummary } from "@/features/rides/rides.queries";
import { RIDE_CARD_STYLE } from "./rideCard";

// About the height of the up to three sentences Gemini writes.
const SKELETON_WIDTHS = ["100%", "100%", "60%"];

export function RideAiSummary({ item }: { item: RideItem }): ReactElement | null {
  const { t } = useTranslation();
  const { data, isError } = useRideAiSummary(item);
  // A failed refetch keeps the text already shown; only a review never had is left out.
  if (!data && isError) return null;

  return (
    <Stack gap={8}>
      <Eyebrow>{t("rides.aiReview")}</Eyebrow>
      <Box px="md" py={14} style={RIDE_CARD_STYLE}>
        {data ? (
          <Text fz={14} lh={1.5} c="text.7">
            {data.summary}
          </Text>
        ) : (
          <Stack gap={8} py={4}>
            {SKELETON_WIDTHS.map((width, index) => (
              <Skeleton key={index} h={12} w={width} radius="sm" />
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
