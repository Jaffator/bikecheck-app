// The ride's AI review: asked for when the detail opens, left out when it cannot be had.
import type { ReactElement } from "react";
import { Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Eyebrow } from "@/components/Eyebrow";
import { useRideAiSummary } from "@/features/rides/rides.queries";

// About the height of the up to three sentences Gemini writes.
const SKELETON_WIDTHS = ["100%", "100%", "60%"];

export function RideAiSummary({ rideId }: { rideId: number }): ReactElement | null {
  const { t } = useTranslation();
  const { data, isError } = useRideAiSummary(rideId);
  // A failed refetch keeps the text already shown; only a review never had is left out.
  if (!data && isError) return null;

  return (
    <Stack gap={6}>
      <Eyebrow>{t("rides.aiReview")}</Eyebrow>
      {data ? (
        <Text fz={13} c="text.7">
          {data.summary}
        </Text>
      ) : (
        <Stack gap={8} py={4}>
          {SKELETON_WIDTHS.map((width, index) => (
            <Skeleton key={index} h={12} w={width} radius="sm" />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
