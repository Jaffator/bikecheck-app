// How many jobs are due, beside the Needs attention heading on phone and desktop alike.
import type { ReactElement } from "react";
import { Center, Text } from "@mantine/core";

export function AttentionCount({ count }: { count: number }): ReactElement {
  return (
    <Center
      miw={22}
      h={22}
      px={6}
      style={{
        flexShrink: 0,
        borderRadius: 9999,
        backgroundColor: "color-mix(in srgb, var(--mantine-color-primary-6) 14%, transparent)",
      }}
    >
      <Text className="tabular-nums" fz={12} fw={700} c="primary.6" lh={1}>
        {count}
      </Text>
    </Center>
  );
}
