import type { ReactElement, ReactNode } from "react";
import { Box, Image, Stack, Text } from "@mantine/core";

// Positions empty-state copy consistently across viewport sizes.
const COPY_TOP_OFFSET = "40dvh";

// Crops the illustration so its fade reaches the copy offset.
const ILLUSTRATION_HEIGHT = "50dvh";

// Fades illustration edges into transparent page background.
const FADE_MASK =
  "linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 22%, rgba(0, 0, 0, 1) 62%, rgba(0, 0, 0, 0) 96%)";

// Separates the illustration from the header edge.
const ILLUSTRATION_TOP_OFFSET = 5;

// Keeps the illustration visually subordinate to foreground copy.
const ILLUSTRATION_OPACITY = 0.2;

interface EmptyStateLayoutProps {
  illustration: string;
  title: string;
  body: string;
  // Renders an optional status pill over the illustration.
  badge?: ReactNode;
  // Renders optional actions below the copy.
  children?: ReactNode;
}

// Frames empty-state content inside AppShell.Main.
export function EmptyStateLayout({ illustration, title, body, badge, children }: EmptyStateLayoutProps): ReactElement {
  return (
    <Box pos="relative" px={16} pb={64}>
      {/* Places the masked illustration behind copy. */}
      <Box pos="absolute" top={ILLUSTRATION_TOP_OFFSET} left={0} right={0} className="pointer-events-none">
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

      {badge && (
        <Box pos="absolute" top={16} right={16}>
          {badge}
        </Box>
      )}

      {/* Positions copy within the illustration fade. */}
      <Stack pos="relative" pt={COPY_TOP_OFFSET} gap={16}>
        <Stack gap={16} ta="center">
          <Text fz={22} lh="32px" fw={600} c="var(--color-text-bright)">
            {title}
          </Text>
          <Text fz={15} lh="26px" c="var(--color-text-dim)">
            {body}
          </Text>
        </Stack>
        {children}
      </Stack>
    </Box>
  );
}
