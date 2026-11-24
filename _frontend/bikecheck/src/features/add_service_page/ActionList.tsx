import type { CSSProperties, ReactElement } from "react";
import { Box, Paper, Stack } from "@mantine/core";
import { Eyebrow } from "@/components/Eyebrow";
import { GroupedList } from "@/components/GroupedList";
import type { CatalogueAction } from "@/features/service/service.types";

// The open action steps out of the list as a card of its own, the same surface but raised.
const LIFTED_CARD: CSSProperties = {
  backgroundColor: "var(--mantine-color-cards-6)",
  border: "none",
  boxShadow: "var(--elev-hero)",
};

interface ActionListProps {
  // Left out where the page names the group itself (desktop heading).
  title?: string;
  actions: CatalogueAction[];
  openId: number | null;
  renderAction: (action: CatalogueAction) => ReactElement;
}

// The list closes up around the open action, so the one being filled in reads as the focus.
export function ActionList({ title, actions, openId, renderAction }: ActionListProps): ReactElement {
  const index = actions.findIndex((action) => action.id === openId);
  if (index < 0) return <GroupedList title={title}>{actions.map(renderAction)}</GroupedList>;

  const before = actions.slice(0, index);
  const after = actions.slice(index + 1);

  return (
    <Stack gap={8}>
      {title !== undefined && (
        <Box px={4}>
          <Eyebrow>{title}</Eyebrow>
        </Box>
      )}
      {before.length > 0 && <GroupedList>{before.map(renderAction)}</GroupedList>}
      <Paper radius="lg" px="md" style={LIFTED_CARD}>
        {renderAction(actions[index])}
      </Paper>
      {after.length > 0 && <GroupedList>{after.map(renderAction)}</GroupedList>}
    </Stack>
  );
}
