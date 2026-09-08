// Putting one overdue Tracked Action off: one tap, no dialog and no number to enter — what
// the Extension is worth is the server's rule. Its own component, so the row stays a
// reading and only a row that offers the control holds a write.
import type { ReactElement } from "react";
import { Group, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Clock3 } from "lucide-react";
import { usePostponeTrackedAction } from "./tracking.queries";
import type { TrackedAction } from "./tracking.types";

interface PostponeControlProps {
  action: TrackedAction;
}

export function PostponeControl({ action }: PostponeControlProps): ReactElement {
  const { t } = useTranslation();
  const postpone = usePostponeTrackedAction();

  return (
    <Group gap="sm" wrap="nowrap">
      <UnstyledButton
        onClick={() => {
          postpone.mutate({
            component_mounted_id: action.component_mounted_id,
            event_action_id: action.event_action_id,
          });
        }}
        disabled={postpone.isPending}
      >
        <Group gap={6} wrap="nowrap">
          <Clock3 size={12} color="var(--color-text-dim)" />
          <Text className="font-mono" fz={11} tt="uppercase" c="primary.6" lts="0.08em">
            {t("tracking.postpone")}
          </Text>
        </Group>
      </UnstyledButton>

      {postpone.isError && (
        <Text fz={11} c="red.5">
          {t("tracking.postponeFailed")}
        </Text>
      )}
    </Group>
  );
}
