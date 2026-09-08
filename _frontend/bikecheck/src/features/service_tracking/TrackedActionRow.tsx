// One Tracked Action, wherever it is read: the part and the job on top, the percentage
// beside them, and the figures the percentage came from underneath. The bike's own page
// and the dashboard show the same row — the dashboard only leads its meta line with the
// bike, because its list spans the whole garage.
import type { ReactElement } from "react";
import { Group, Progress, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { positionLabel } from "@/features/components/componentLabels";
import { ATTENTION_COLORS, axisReading, barFill } from "./attentionLevel";
import { PostponeControl } from "./PostponeControl";
import type { TrackedAction } from "./tracking.types";

interface TrackedActionRowProps {
  action: TrackedAction;
  // What the meta line leads with before the job. Null on a bike's own page, where every
  // row is about the same bike and naming it on each would say nothing.
  prefix: string | null;
  // Where the row leads. Null where it leads nowhere, and then it is not a control at all.
  onOpen: (() => void) | null;
}

export function TrackedActionRow({ action, prefix, onOpen }: TrackedActionRowProps): ReactElement {
  const { t, i18n } = useTranslation();
  const color = ATTENTION_COLORS[action.level];
  const side = positionLabel(action.position, t);
  const part = catalogueLabel(action.component_type_i18n_key, action.component_type, t);
  const job = catalogueLabel(action.action_i18n_key, action.action_name, t);

  const reading = (
    <Stack gap={6}>
      <Group gap="sm" wrap="nowrap" align="baseline">
        <Text fz={13} fw={600} c="text.6" lineClamp={1} style={{ minWidth: 0 }}>
          {side === null ? part : `${part} (${side})`}
        </Text>
        <Text className="font-mono" fz={12} c={color} ml="auto" style={{ whiteSpace: "nowrap" }}>
          {t("tracking.percentage", { value: action.percentage })}
        </Text>
        {onOpen !== null && <ChevronRight size={14} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />}
      </Group>

      <Progress
        value={barFill(action) * 100}
        size={5}
        radius="xl"
        styles={{
          root: { backgroundColor: "var(--color-decor)" },
          section: { backgroundColor: color },
        }}
      />

      <Group gap="sm" wrap="nowrap" align="baseline">
        <Text
          className="font-mono"
          fz={11}
          tt="uppercase"
          c="var(--color-text-dim)"
          lts="0.08em"
          lineClamp={1}
          style={{ minWidth: 0 }}
        >
          {prefix === null ? job : `${prefix} · ${job}`}
        </Text>
        <Group gap="sm" wrap="nowrap" ml="auto" style={{ whiteSpace: "nowrap" }}>
          {/* What a tap on the control left behind: the interval beside it is longer for it. */}
          {action.extended && (
            <Text className="font-mono" fz={11} tt="uppercase" c="primary.6" lts="0.08em">
              {t("tracking.extended")}
            </Text>
          )}
          <Text className="font-mono" fz={11} tt="uppercase" c="var(--color-text-dim)" lts="0.08em">
            {axisReading(action, i18n.language)}
          </Text>
        </Group>
      </Group>
    </Stack>
  );

  const body =
    onOpen === null ? (
      reading
    ) : (
      <UnstyledButton
        onClick={onOpen}
        className="active:scale-[0.985]"
        style={{ display: "block", width: "100%", transition: "transform 0.12s ease" }}
      >
        {reading}
      </UnstyledButton>
    );

  // Only a job already past due is worth putting off — anything else is not being ridden
  // on borrowed time yet. Its own control, outside whatever the row leads to, so a tap on
  // it is never a tap into the bike.
  if (action.level !== "overdue") return body;

  return (
    <Stack gap={8}>
      {body}

      <PostponeControl action={action} />
    </Stack>
  );
}
