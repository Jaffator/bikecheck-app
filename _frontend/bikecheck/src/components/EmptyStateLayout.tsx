import type { ReactElement, ReactNode } from "react";
import { Box, Image, Stack, Text } from "@mantine/core";

// Where the headline starts on every empty state. Viewport-relative so the copy
// lands at the same physical height on every phone — a width-relative offset
// would drift with screen width, and an image-relative one would drift with the
// illustration's aspect ratio.
const COPY_TOP_OFFSET = "40dvh";

// The illustration is cropped to this height so its fade always meets the copy
// at COPY_TOP_OFFSET, whatever the source image's aspect ratio is.
const ILLUSTRATION_HEIGHT = "50dvh";

// Dissolves both crop edges into full transparency, so the image ends in the
// page background instead of a hard line at either end. Alpha, not a colour —
// it needs no knowledge of what is behind it.
const FADE_MASK =
  "linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 22%, rgba(0, 0, 0, 1) 62%, rgba(0, 0, 0, 0) 96%)";

// Just enough of a gap to keep the illustration off the header edge — the top
// fade does the rest of the separation.
const ILLUSTRATION_TOP_OFFSET = 5;

// The illustration is a backdrop, not content — kept dim so it never competes
// with the copy sitting on top of it. The page background is near-black, so a
// lower value reads as darker.
const ILLUSTRATION_OPACITY = 0.2;

interface EmptyStateLayoutProps {
  illustration: string;
  title: string;
  body: string;
  // The status pill some empty states drop over the illustration's top-right.
  badge?: ReactNode;
  // Anything below the copy — CTA button, pro tip card.
  children?: ReactNode;
}

// Shared frame for the "nothing here yet" pages (garage, service, rides). The
// header and the tab bar around it belong to AppLayout — this is only the
// AppShell.Main content.
export function EmptyStateLayout({ illustration, title, body, badge, children }: EmptyStateLayoutProps): ReactElement {
  return (
    <Box pos="relative" px={16} pb={64}>
      {/* ----------- Illustration layer ----------- */}
      {/* Sits behind the copy on purpose: the mask fades the lower half of the
          illustration out so the heading sits on top of it. */}
      <Box pos="absolute" top={ILLUSTRATION_TOP_OFFSET} left={0} right={0} className="pointer-events-none">
        <Image
          src={illustration}
          alt=""
          w="100%"
          h={ILLUSTRATION_HEIGHT}
          fit="cover"
          opacity={ILLUSTRATION_OPACITY}
          // Fading the image's own alpha rather than painting a matching
          // gradient on top: the crop edges disappear whatever the page sits
          // on, so nothing has to be kept in sync with the background colour.
          // No boxShadow here — a glow would outline the very edges the mask
          // is dissolving.
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

      {/* ----------- Copy + actions ----------- */}
      {/* pt drops the text onto the faded-out part of the illustration above it. */}
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
