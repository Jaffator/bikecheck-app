import type { ReactElement, ReactNode } from "react";
import { Box, Center, Image, Stack, Text } from "@mantine/core";

// Where the title sits on every empty page, measured from the top of the content area. A page
// with chrome above it subtracts that chrome, so the title lands on the same line everywhere.
export const EMPTY_STATE_TOP = "38dvh";

// Crops the illustration so its fade reaches the copy offset.
const ILLUSTRATION_HEIGHT = "50dvh";

// Fades illustration edges into transparent page background.
const FADE_MASK =
  "linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 22%, rgba(0, 0, 0, 1) 62%, rgba(0, 0, 0, 0) 96%)";

// Separates the illustration from the header edge.
const ILLUSTRATION_TOP_OFFSET = 5;

// The illustration reads as a picture behind the copy; the fade mask keeps the text legible.
const ILLUSTRATION_OPACITY = 0.3;

// An icon carries far less ink than an illustration, so it may sit stronger - but not stronger
// than the dimmed title it heads.
const ICON_OPACITY = 0.3;

// Separates the icon from the title it heads.
const ICON_GAP = 16;

// Holds the title and its body together as one block.
const TITLE_BODY_GAP = 8;


interface EmptyStateLayoutProps {
  // The illustration behind the copy. Pages without one pass an icon instead.
  illustration?: string;
  // Heads the copy on pages with no illustration. Hangs above the title without taking flow
  // height, so the title keeps its offset on every page.
  icon?: ReactNode;
  title: string;
  body: string;
  // Renders an optional status pill over the illustration.
  badge?: ReactNode;
  // Content above the copy, inside the layout - so the illustration runs behind it rather
  // than starting below it.
  header?: ReactNode;
  // Renders optional actions below the copy.
  children?: ReactNode;
  // The space above the title. Defaults to EMPTY_STATE_TOP; a page with chrome above passes
  // that offset less its chrome, and a page with content above passes a plain gap instead.
  topSpace?: string;
}

// Frames empty-state content inside AppShell.Main.
export function EmptyStateLayout({
  illustration,
  icon,
  title,
  body,
  badge,
  header,
  children,
  topSpace = EMPTY_STATE_TOP,
}: EmptyStateLayoutProps): ReactElement {
  return (
    // Holds the height the absolutely-placed illustration needs, so a page that clips its
    // overflow - the rides swipe track - does not cut the image off.
    <Box
      pos="relative"
      px={16}
      pb={64}
      mih={illustration === undefined ? undefined : `calc(${String(ILLUSTRATION_TOP_OFFSET)}px + ${ILLUSTRATION_HEIGHT})`}
    >
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

      {header !== undefined && <Box pos="relative">{header}</Box>}

      {/* Positions copy within the illustration fade. */}
      <Stack pos="relative" pt={topSpace} gap={16}>
        <Box pos="relative">
          {/* Anchored to the copy block, so the two move as one when the keyboard resizes the
              viewport rather than drifting apart at different rates. */}
          {icon !== undefined && (
            <Center
              pos="absolute"
              left={0}
              right={0}
              bottom="100%"
              mb={ICON_GAP}
              opacity={ICON_OPACITY}
              c="var(--color-text-dim)"
            >
              {icon}
            </Center>
          )}
          <Stack gap={TITLE_BODY_GAP} ta="center">
            <Text fz={18} lh="26px" fw={600} c="text.6">
              {title}
            </Text>
            <Text fz={14} lh="22px" c="text.8">
              {body}
            </Text>
          </Stack>
        </Box>
        {children}
      </Stack>
    </Box>
  );
}
