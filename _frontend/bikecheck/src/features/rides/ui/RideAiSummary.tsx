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
  const { data, isPending, isError } = useRideAiSummary(rideId);
  if (isError) return null;

  return (
    <Stack gap={6}>
      <Eyebrow>{t("rides.aiReview")}</Eyebrow>
      {isPending ? (
        <Stack gap={8} py={4}>
          {SKELETON_WIDTHS.map((width, index) => (
            <Skeleton key={index} h={12} w={width} radius="sm" />
          ))}
        </Stack>
      ) : (
        <Text fz={14} lh={1.5} c="text.6">
          {data.summary}
        </Text>
      )}
    </Stack>
  );
}
