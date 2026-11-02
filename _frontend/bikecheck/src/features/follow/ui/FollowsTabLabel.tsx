import type { ReactElement } from "react";
import { Text } from "@mantine/core";

// A tab's label with its count once the list is in; the label alone while it loads or failed.
export function FollowsTabLabel({ label, count }: { label: string; count: number | undefined }): ReactElement {
  return (
    <>
      {label}
      {count !== undefined && (
        <Text component="span" className="tabular-nums" fz={12} c="text.8" ml={6}>
          {count}
        </Text>
      )}
    </>
  );
}
