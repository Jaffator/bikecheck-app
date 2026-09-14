import type { ReactElement, ReactNode } from "react";
import { Box, Center, Image, Stack, Text } from "@mantine/core";

// The band the copy is centred in, so the group sits mid-screen rather than at a fixed offset.
const COPY_BAND_HEIGHT = "78dvh";

// Crops the illustration so its fade reaches the copy offset.
const ILLUSTRATION_HEIGHT = "50dvh";

// Fades illustration edges into transparent page background.
const FADE_MASK =
  "linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 22%, rgba(0, 0, 0, 1) 62%, rgba(0, 0, 0, 0) 96%)";

// Separates the illustration from the header edge.
const ILLUSTRATION_TOP_OFFSET = 5;

// Keeps the illustration visually subordinate to foreground copy.
const ILLUSTRATION_OPACITY = 0.2;

// An icon carries far less ink than an illustration, so it may sit stronger.
const ICON_OPACITY = 0.45;

// Separates the icon from the title it heads.
const ICON_GAP = 16;

// Holds the title and its body together as one block.
const TITLE_BODY_GAP = 8;

interface EmptyStateLayoutProps {
  // The illustration behind the copy. Pages without one pass an icon instead.
  illustration?: string;
  // Heads the copy on pages with no illustration. Sits in the copy group, not behind it.
  icon?: ReactNode;
  title: string;
  body: string;
  // Renders an optional status pill over the illustration.
  badge?: ReactNode;
  // Renders optional actions below the copy.
  children?: ReactNode;
  // The band the copy is centred in. Pages that centre the state in a fixed area of their
  // own pass "auto", so the layout adds no height of its own.
  bandHeight?: string;
}

// Frames empty-state content inside AppShell.Main.
export function EmptyStateLayout({
  illustration,
  icon,
  title,
  body,
  badge,
  children,
  bandHeight = COPY_BAND_HEIGHT,
}: EmptyStateLayoutProps): ReactElement {
  return (
    <Box pos="relative" px={16} pb={64}>
      {/* Places the masked illustration behind copy. */}
      {illustration !== undefined && (
        <Box
          pos="absolute"
          top={ILLUSTRATION_TOP_OFFSET}
          left={0}
          right={0}
          className="pointer-events-none"
        >
          <Image
            src={illustration}
            alt=""
            w="100%"
            h={ILLUSTRATION_HEIGHT}
            fit="cover"
            opacity={ILLUSTRATION_OPACITY}
            // Masks image alpha so crop edges blend into any background.
            style={{
              maskImage: FADE_MASK,
              WebkitMaskImage: FADE_MASK,
            }}
          />
        </Box>
      )}

      {badge && (
        <Box pos="absolute" top={16} right={16}>
          {badge}
        </Box>
      )}

      {/* Positions copy within the illustration fade. */}
      <Stack pos="relative" mih={bandHeight} justify="center" gap={16}>
        <Stack gap={ICON_GAP}>
          {/* In the flow with the copy, so the two move as one when the keyboard resizes the
              viewport rather than drifting apart at different rates. */}
          {icon !== undefined && (
            <Center opacity={ICON_OPACITY} c="var(--color-text-dim)">
              {icon}
            </Center>
          )}
          <Stack gap={TITLE_BODY_GAP} ta="center">
            <Text fz={22} lh="32px" fw={600} c="var(--color-text-bright)">
              {title}
            </Text>
            <Text fz={15} lh="26px" c="var(--color-text-dim)">
              {body}
            </Text>
          </Stack>
        </Stack>
        {children}
      </Stack>
    </Box>
  );
}
