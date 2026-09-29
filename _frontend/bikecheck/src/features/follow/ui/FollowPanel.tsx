// One section of the Follows screen: a mono eyebrow over rows split by hairlines, straight on
// the page background. An empty one stays and says so in one dim line.
import { Fragment, type ReactElement, type ReactNode } from "react";
import { Divider, Stack, Text } from "@mantine/core";
import { EYEBROW } from "@/features/profile/profileSurface";

interface FollowPanelProps {
  title: ReactNode;
  // What the panel says with nothing to list.
  empty?: ReactNode;
  // Keyed by the caller, so a row keeps its state when the list around it changes.
  children: ReactElement[];
}

export function FollowPanel({ title, empty, children }: FollowPanelProps): ReactElement {
  return (
    <Stack gap={4}>
      <Text {...EYEBROW}>{title}</Text>
      {children.length === 0 ? (
        <Text fz={14} c="var(--color-text-dim)" py="xs">
          {empty}
        </Text>
      ) : (
        children.map((child, index) => (
          <Fragment key={child.key ?? index}>
            {index > 0 && <Divider color="var(--color-border-subtle)" />}
            {child}
          </Fragment>
        ))
      )}
    </Stack>
  );
}
