// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Card, Text } from "@mantine/core";

export function Notifications(): ReactElement {
  return (
    <Card bg="cards.6" className="m-3 border">
      <Text c="text.6">NOTIFICATIONS PAGE</Text>
    </Card>
  );
}
