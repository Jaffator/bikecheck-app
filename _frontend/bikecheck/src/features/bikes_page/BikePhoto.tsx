// One frame for every bike photo, so a dark trail shot and a white studio
// cutout keep the same rhythm down the garage list.
import type { ReactElement, ReactNode } from "react";
import { Box, Group, Image, Stack, Text } from "@mantine/core";
import { Gauge } from "lucide-react";
import { PHOTO_ASPECT } from "../add_bike_page/photoCrop";

interface BikePhotoProps {
  imageUrl: string | null;
  title: string;
  // The nickname its owner gave the bike, where there is one.
  subtitle: string | null;
  // The detail hero sets 24; the garage card names the bike under the photo.
  titleSize: number;
  // False leaves the photo bare — the caller writes the name itself.
  showCaption?: boolean;
  // Sits in the bottom-right corner — health and Strava badges.
  children?: ReactNode;
}

// Reaches near-black at the bottom edge, so the title reads on a white cutout too.
const PHOTO_GRADIENT = "linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.5) 30%, transparent 60%)";

export function BikePhoto({
  imageUrl,
  title,
  subtitle,
  titleSize,
  showCaption = true,
  children,
}: BikePhotoProps): ReactElement {
  return (
    <Box style={{ position: "relative", aspectRatio: PHOTO_ASPECT, overflow: "hidden" }}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={title}
          w="100%"
          h="100%"
          // Fill the slot with the upload-cropped photo.
          fit="cover"
          // Load card images as they enter the viewport.
          loading="lazy"
          // Absolute, so a rounded-down cover height cannot leave a white strip below it.
          style={{ backgroundColor: "#FFFFFF", position: "absolute", inset: 0, display: "block" }}
        />
      ) : (
        // A bike with no photo keeps the slot, so the list never changes shape.
        <Box
          h="100%"
          bg="cards.7"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            // Lift the icon clear of the title lying at the bottom.
            paddingBottom: "2.5rem",
          }}
        >
          <Gauge size={32} color="var(--mantine-color-text-9)" />
        </Box>
      )}

      {/* Carries the title on every photo and evens out how bright they are. */}
      <Box aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", background: PHOTO_GRADIENT }} />

      <Group
        // With no caption the badges are the only child, and must stay right.
        justify={showCaption ? "space-between" : "flex-end"}
        align="flex-end"
        wrap="nowrap"
        gap="sm"
        style={{ position: "absolute", left: "0.75rem", right: "0.75rem", bottom: "0.625rem" }}
      >
        {showCaption && (
          <Stack gap={2} style={{ minWidth: 0 }}>
            {/* Clamped so the text block always ends inside the gradient. */}
            <Text fw={700} fz={titleSize} c="#FFFFFF" lh={1.2} lineClamp={1}>
              {title}
            </Text>
            {subtitle !== null && subtitle !== "" && (
              <Text className="font-mono" fz={11} tt="uppercase" c="rgba(255, 255, 255, 0.72)" lineClamp={1}>
                {subtitle}
              </Text>
            )}
          </Stack>
        )}
        {children}
      </Group>
    </Box>
  );
}
