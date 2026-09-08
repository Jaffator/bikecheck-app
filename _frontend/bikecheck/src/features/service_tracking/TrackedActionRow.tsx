// One Tracked Action, wherever it is read: the job on top, the percentage beside it, and
// underneath the part it is owed on with the figures behind the reading. The job leads
// because the row is about work waiting, not about a part. The bike's own page and the
// dashboard show the same row — the dashboard only leads its meta line with the bike,
// because its list spans the whole garage.
import { useState, type ReactElement } from "react";
import { ActionIcon, Box, Group, Progress, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ChevronRight, Info } from "lucide-react";
import { ExplanationModal } from "@/components/ExplanationModal";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { positionLabel, wearExplanation } from "@/features/components/componentLabels";
import { attentionColor, axisReading, barFill } from "./attentionLevel";
import { PostponeControl } from "./PostponeControl";
import type { TrackedAction } from "./tracking.types";

interface TrackedActionRowProps {
  action: TrackedAction;
  // What the meta line leads with before the part. Null on a bike's own page, where every
  // row is about the same bike and naming it on each would say nothing.
  prefix: string | null;
  // Where the row leads. Null where it leads nowhere, and then it is not a control at all.
  onOpen: (() => void) | null;
}

export function TrackedActionRow({ action, prefix, onOpen }: TrackedActionRowProps): ReactElement {
  const { t, i18n } = useTranslation();
  const color = attentionColor(action.percentage);
  // Only a reading the ride analysis derived says what it is; the odometer's own figures
  // need no help. Null leaves the row without a button at all.
  const explanation = wearExplanation(action.measure, t);
  const [explained, setExplained] = useState(false);
  const side = positionLabel(action.position, t);
  const job = catalogueLabel(action.action_i18n_key, action.action_name, t);
  // Which part owes it: the side is what tells two tyres apart, so it never leaves the name.
  const type = catalogueLabel(action.component_type_i18n_key, action.component_type, t);
  const part = side === null ? type : `${type} (${side})`;

  const reading = (
    <Stack gap={6}>
      <Group gap="sm" wrap="nowrap" align="baseline">
        <Text fz={13} fw={600} c="text.6" lineClamp={1} style={{ minWidth: 0 }}>
          {job}
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
          {prefix === null ? part : `${prefix} · ${part}`}
        </Text>
        <Group gap="sm" wrap="nowrap" ml="auto" style={{ whiteSpace: "nowrap" }}>
          {/* What a tap on the control left behind: the interval beside it is longer for it. */}
          {action.extended && (
            <Text className="font-mono" fz={11} tt="uppercase" c="primary.6" lts="0.08em">
              {t("tracking.extended")}
            </Text>
          )}
          <Text className="font-mono" fz={11} tt="uppercase" c="var(--color-text-dim)" lts="0.08em">
            {axisReading(action, i18n.language, t)}
          </Text>
        </Group>
      </Group>
    </Stack>
  );

  // The info button sits beside the reading, never inside it: a button within a button is
  // not valid markup - the same reason a part's row keeps its menu outside its own tap.
  const body = (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      {onOpen === null ? (
        <Box style={{ flex: 1, minWidth: 0 }}>{reading}</Box>
      ) : (
        <UnstyledButton
          onClick={onOpen}
          className="active:scale-[0.985]"
          style={{ display: "block", flex: 1, minWidth: 0, transition: "transform 0.12s ease" }}
        >
          {reading}
        </UnstyledButton>
      )}

      {explanation !== null && (
        <ActionIcon
          variant="transparent"
          color="gray"
          size="xs"
          aria-label={explanation.aria}
          onClick={() => {
            setExplained(true);
          }}
          style={{ flexShrink: 0 }}
        >
          <Info size={13} color="var(--color-text-dim)" />
        </ActionIcon>
      )}

      <ExplanationModal
        explained={explained ? explanation : null}
        onClose={() => {
          setExplained(false);
        }}
      />
    </Group>
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
