// One Tracked Action in full: the reading the row showed, the one button that records the
// job, and the three things about it that had nowhere else to live — the Service Interval
// it is measured against, putting it off, and whether it announces itself (ADR 0032).
// Opened from the bike's own page and from the dashboard alike, so a row that looks the
// same behaves the same wherever it is met.
import { useState, type ReactElement, type ReactNode } from "react";
import { ActionIcon, Box, Button, Divider, Drawer, Group, NumberInput, Progress, Stack, Switch, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { Clock3, X } from "lucide-react";
import { inputStyles } from "@/features/add_bike_page/formStyles";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { measureLabel, positionLabel } from "@/features/components/componentLabels";
import { attentionColor, barFill } from "@/features/service_tracking/attentionLevel";
import {
  axisUnit,
  axisValue,
  fromAxisUnit,
  inAxisUnit,
  intervalInForce,
  remainingWear,
} from "@/features/service_tracking/intervalFigures";
import { trackedActionServiceLink } from "@/features/service_tracking/serviceLink";
import {
  usePostponeTrackedAction,
  useSetTrackedActionInterval,
  useSetTrackedActionNotify,
} from "@/features/service_tracking/tracking.queries";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";

// The same layer every other sheet stands on, so overlays never fight the FAB.
const SHEET_Z_INDEX = 300;

interface TrackedActionDrawerProps {
  // Null closes the drawer.
  action: TrackedAction | null;
  onClose: () => void;
}

export function TrackedActionDrawer({ action, onClose }: TrackedActionDrawerProps): ReactElement {
  const [shown, opening, written] = useOpenedReading(action);

  // Android's back gesture dismisses this rather than the page under it.
  useOverlayBack(action !== null, onClose);

  return (
    <Drawer
      opened={action !== null}
      onClose={onClose}
      position="bottom"
      radius="lg"
      zIndex={SHEET_Z_INDEX}
      withCloseButton={false}
      transitionProps={{
        duration: 400,
        exitDuration: 400,
        transition: "slide-up",
        timingFunction: "cubic-bezier(0.2, 0, 0, 1)",
      }}
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      styles={{
        // One reading is as tall as it is, so the sheet takes the height it needs and stops
        // short of covering the page it was opened from.
        content: {
          height: "auto",
          maxHeight: "85vh",
          backgroundColor: "var(--mantine-color-cards-6)",
          display: "flex",
          flexDirection: "column",
        },
        body: { flex: 1, minHeight: 0, padding: 0, display: "flex", flexDirection: "column" },
      }}
    >
      {/* Says "floating layer" and nothing more: the sheet does not answer to a drag. */}
      <Box
        mx="auto"
        mt="xs"
        w={36}
        h={4}
        style={{ borderRadius: 9999, backgroundColor: "var(--color-border-subtle)", flexShrink: 0 }}
      />

      <Box
        px="md"
        pt="md"
        pb="calc(1.25rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))"
        style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
      >
        {/* Keyed on the opening, so every one starts with a closed editor rather than
            however the last one was left. */}
        {shown !== null && <Body key={opening} action={shown} onWritten={written} onClose={onClose} />}
      </Box>
    </Drawer>
  );
}

// Everything inside the sheet, over the reading as it now stands.
function Body({
  action,
  onWritten,
  onClose,
}: {
  action: TrackedAction;
  onWritten: (written: TrackedAction) => void;
  onClose: () => void;
}): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const job = catalogueLabel(action.action_i18n_key, action.action_name, t);

  return (
    <Stack gap="lg">
      <Header action={action} job={job} onClose={onClose} />

      <ReadingCard action={action} />

      <Button
        fullWidth
        color="primary.6"
        c="textDark.6"
        radius="md"
        onClick={() => {
          navigate(trackedActionServiceLink(action));
        }}
      >
        {t(action.replace_action ? "tracking.logReplacement" : "tracking.logService")}
      </Button>

      <Stack gap={0}>
        <Divider color="var(--mantine-color-inputs-5)" />
        <IntervalSetting action={action} onWritten={onWritten} />
        <PostponeSetting action={action} onWritten={onWritten} />
        <AnnounceSetting action={action} onWritten={onWritten} />
      </Stack>
    </Stack>
  );
}

// The job leads, because the drawer is about work waiting; the part follows, because it is
// which one owes it — and the side is what tells two tyres apart.
function Header({
  action,
  job,
  onClose,
}: {
  action: TrackedAction;
  job: string;
  onClose: () => void;
}): ReactElement {
  const { t } = useTranslation();
  const side = positionLabel(action.position, t);
  const type = catalogueLabel(action.component_type_i18n_key, action.component_type, t);
  const part = side === null ? type : `${type} (${side})`;
  const mounted = action.mounted_at === null ? null : dayjs(action.mounted_at).format("D. M. YYYY");

  return (
    <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
      <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
        <Text fz={20} fw={700} c="text.6" lh={1.2} lineClamp={2}>
          {job}
        </Text>
        <Text className="font-mono" fz={11} tt="uppercase" lts="0.08em" c="var(--color-text-dim)" lineClamp={2}>
          {mounted === null ? part : `${part} · ${t("tracking.mountedOn", { date: mounted })}`}
        </Text>
      </Stack>

      <ActionIcon
        variant="subtle"
        color="gray"
        radius="xl"
        size="md"
        aria-label={t("action.close")}
        onClick={onClose}
        style={{ flexShrink: 0 }}
      >
        <X size={18} color="var(--color-text-dim)" />
      </ActionIcon>
    </Group>
  );
}

// The same number and the same colour the row showed, and then the two figures behind
// them: how far the part has come against the interval in force, and what is left of it.
function ReadingCard({ action }: { action: TrackedAction }): ReactElement {
  const { t, i18n } = useTranslation();
  const color = attentionColor(action.percentage);
  const unit = axisUnit(action.axis);
  // The unit lands once at the end, the way the row writes the same pair.
  const figure = (value: number): string => `${axisValue(action.axis, value, i18n.language)} ${unit}`.trim();
  const wear = `${axisValue(action.axis, action.current, i18n.language)} / ${figure(action.interval)}`;

  return (
    <Stack gap="sm">
      <Group justify="space-between" wrap="nowrap" align="center">
        <Group
          gap={5}
          px={8}
          py={3}
          style={{
            borderRadius: "9999px",
            border: `1px solid ${color}`,
            backgroundColor: "color-mix(in srgb, var(--mantine-color-cards-4) 60%, transparent)",
          }}
        >
          <Box w={6} h={6} style={{ borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
          <Text className="font-mono" fz={10} tt="uppercase" lts="0.08em" c={color}>
            {t(`bikes.health.${action.level}`)}
          </Text>
        </Group>

        <Group gap={8} wrap="nowrap" align="center">
          {/* Why the interval read here is longer than the Service Interval row below it. */}
          {action.extended && <Pill label={t("tracking.extended")} />}
          <Text className="font-mono" fz={22} fw={100} c={color} lh={1}>
            {t("tracking.percentage", { value: action.percentage })}
          </Text>
        </Group>
      </Group>

      <Progress
        value={barFill(action) * 100}
        size={6}
        radius="xl"
        styles={{
          root: { backgroundColor: "var(--color-decor-sunk)" },
          section: { backgroundColor: color },
        }}
      />

      {/* Named by the accumulator it was taken from, so suspension hours are never read as
          the bike's own and drivetrain kilometres never as the odometer's. */}
      <Figure label={measureLabel(action.measure, t)} value={wear} />
      <Figure label={t("tracking.remaining")} value={figure(remainingWear(action))} />
    </Stack>
  );
}

// The small mark that qualifies a reading: extended, or measured against the owner's own
// interval. One shape, so the two can never be told apart by accident.
function Pill({ label }: { label: string }): ReactElement {
  return (
    <Text
      className="font-mono"
      fz={9}
      tt="uppercase"
      c="primary.5"
      lts="0.08em"
      px={6}
      py={1}
      style={{
        borderRadius: "9999px",
        backgroundColor: "color-mix(in srgb, var(--mantine-color-primary-6) 14%, transparent)",
        lineHeight: 1.4,
        flexShrink: 0,
      }}
    >
      {label}
    </Text>
  );
}

// One figure under the bar: what it is on the left, what it says on the right.
function Figure({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Group justify="space-between" wrap="nowrap" gap="md" align="baseline">
      <Text className="font-mono" fz={11} tt="uppercase" lts="0.08em" c="var(--color-text-dim)" lineClamp={1}>
        {label}
      </Text>
      <Text className="font-mono" fz={13} c="text.7" style={{ whiteSpace: "nowrap" }}>
        {value}
      </Text>
    </Group>
  );
}

// The Service Interval the percentage is measured against, and the owner's way of
// disagreeing with it. The editor expands under the row rather than opening a layer, so the
// reading it changes stays in sight while it is typed (ADR 0033).
function IntervalSetting({
  action,
  onWritten,
}: {
  action: TrackedAction;
  onWritten: (action: TrackedAction) => void;
}): ReactElement {
  const { t, i18n } = useTranslation();
  const write = useSetTrackedActionInterval();
  const [editing, setEditing] = useState(false);
  const [entered, setEntered] = useState<string | number>(inAxisUnit(action.axis, intervalInForce(action)));

  const unit = axisUnit(action.axis);
  const inForce = `${axisValue(action.axis, intervalInForce(action), i18n.language)} ${unit}`.trim();
  const plan = `${axisValue(action.axis, action.default_interval, i18n.language)} ${unit}`.trim();
  const value = Number(entered);
  const usable = Number.isFinite(value) && value > 0;

  const save = (override: number | null): void => {
    write.mutate(
      {
        component_mounted_id: action.component_mounted_id,
        event_action_id: action.event_action_id,
        interval_override: override,
      },
      {
        onSuccess: (updated) => {
          onWritten(updated);
          setEntered(inAxisUnit(updated.axis, intervalInForce(updated)));
          setEditing(false);
        },
      },
    );
  };

  return (
    <SettingRow
      label={t("tracking.intervalLabel")}
      badge={action.interval_override === null ? null : t("tracking.intervalCustom")}
      onTap={() => {
        setEditing((open) => !open);
      }}
      value={
        <Text className="font-mono" fz={13} c="text.7" style={{ whiteSpace: "nowrap" }}>
          {inForce}
        </Text>
      }
      expanded={
        editing ? (
          <Stack gap="sm" pb={12}>
            <Group gap="sm" wrap="nowrap" align="flex-end">
              <NumberInput
                value={entered}
                min={1}
                allowNegative={false}
                allowDecimal={false}
                hideControls
                aria-label={t("tracking.intervalLabel")}
                styles={inputStyles}
                style={{ flex: 1 }}
                onChange={setEntered}
              />
              {/* Fixed beside the field: the axis is never the owner's to change, so hours
                  cannot be entered where kilometres were meant. */}
              {unit !== "" && (
                <Text className="font-mono" fz={13} c="text.7" pb={8} style={{ whiteSpace: "nowrap" }}>
                  {unit}
                </Text>
              )}
            </Group>

            <Text fz={12} c="var(--color-text-dim)">
              {t("tracking.intervalDefault", { value: plan })}
            </Text>

            <Group gap="sm" wrap="nowrap">
              <Button
                color="primary.6"
                c="textDark.6"
                radius="md"
                size="sm"
                disabled={!usable}
                loading={write.isPending}
                onClick={() => {
                  save(fromAxisUnit(action.axis, value));
                }}
              >
                {t("tracking.intervalSave")}
              </Button>
              {action.interval_override !== null && (
                <Button
                  variant="outline"
                  radius="md"
                  size="sm"
                  disabled={write.isPending}
                  onClick={() => {
                    save(null);
                  }}
                >
                  {t("tracking.intervalReset")}
                </Button>
              )}
            </Group>

            {write.isError && (
              <Text fz={11} c="red.5">
                {t("tracking.intervalFailed")}
              </Text>
            )}
          </Stack>
        ) : null
      }
    />
  );
}

// Putting the job off: one tap, no dialog and no number to enter, and offered whatever the
// reading says — planning does not have to wait for being late.
function PostponeSetting({
  action,
  onWritten,
}: {
  action: TrackedAction;
  onWritten: (action: TrackedAction) => void;
}): ReactElement {
  const { t, i18n } = useTranslation();
  const postpone = usePostponeTrackedAction();
  const by = `${axisValue(action.axis, action.postpone_by, i18n.language)} ${axisUnit(action.axis)}`.trim();

  return (
    <SettingRow
      label={t("tracking.postponeBy", { value: by })}
      badge={null}
      // Deaf while the last tap is still in flight: putting the same job off twice by
      // accident would put it off twice as far.
      onTap={
        postpone.isPending
          ? null
          : () => {
              postpone.mutate(
                { component_mounted_id: action.component_mounted_id, event_action_id: action.event_action_id },
                { onSuccess: onWritten },
              );
            }
      }
      value={<Clock3 size={16} color="var(--color-text-dim)" />}
      expanded={
        postpone.isError ? (
          <Text fz={11} c="red.5" pb={12}>
            {t("tracking.postponeFailed")}
          </Text>
        ) : null
      }
    />
  );
}

// Whether the app may interrupt about this job. Off stops the push and nothing else: the
// percentage still reads, the colour still warns and the dashboard still lists it.
function AnnounceSetting({
  action,
  onWritten,
}: {
  action: TrackedAction;
  onWritten: (action: TrackedAction) => void;
}): ReactElement {
  const { t } = useTranslation();
  const write = useSetTrackedActionNotify();

  const change = (notify: boolean): void => {
    write.mutate(
      { component_mounted_id: action.component_mounted_id, event_action_id: action.event_action_id, notify },
      { onSuccess: onWritten },
    );
  };

  return (
    <SettingRow
      label={t("tracking.announceLabel")}
      badge={null}
      onTap={null}
      value={
        <Switch
          withThumbIndicator={false}
          checked={action.notify}
          disabled={write.isPending}
          aria-label={t("tracking.announceLabel")}
          onChange={(event) => {
            change(event.currentTarget.checked);
          }}
          styles={{
            track: {
              backgroundColor: action.notify ? "var(--mantine-color-primary-6)" : "var(--mantine-color-cards-4)",
              borderColor: "var(--mantine-color-other-borderSolid)",
            },
            thumb: {
              backgroundColor: action.notify ? "var(--mantine-color-black)" : "var(--mantine-color-text-6)",
            },
          }}
        />
      }
      expanded={
        write.isError ? (
          <Text fz={11} c="red.5" pb={12}>
            {t("tracking.announceFailed")}
          </Text>
        ) : null
      }
    />
  );
}

// One control in the list under the button: what it is on the left, what it stands at on
// the right, and whatever it expands into beneath. A row with nothing to tap is not a
// control at all — its switch is.
function SettingRow({
  label,
  badge,
  value,
  onTap,
  expanded,
}: {
  label: string;
  // "Custom", where the owner has departed from the bike's plan.
  badge: string | null;
  value: ReactNode;
  onTap: (() => void) | null;
  expanded: ReactNode;
}): ReactElement {
  const heading = (
    <Group justify="space-between" wrap="nowrap" gap="md" py={14} align="center">
      <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
        <Text fz={14} fw={600} c="text.6" lineClamp={1}>
          {label}
        </Text>
        {badge !== null && <Pill label={badge} />}
      </Group>
      <Box style={{ flexShrink: 0 }}>{value}</Box>
    </Group>
  );

  return (
    <>
      {onTap === null ? (
        heading
      ) : (
        <Box
          role="button"
          tabIndex={0}
          onClick={onTap}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            onTap();
          }}
          style={{ cursor: "pointer" }}
        >
          {heading}
        </Box>
      )}
      {expanded}
      <Divider color="var(--mantine-color-inputs-5)" />
    </>
  );
}

// The reading the drawer shows: what the row was opened on, then whatever each write
// answered with. Kept after closing so the sheet animates out with its content, and
// re-seeded on every opening — the count it returns is what the body is keyed on.
function useOpenedReading(
  action: TrackedAction | null,
): [TrackedAction | null, number, (written: TrackedAction) => void] {
  const [shown, setShown] = useState<TrackedAction | null>(action);
  const [given, setGiven] = useState<TrackedAction | null>(action);
  const [opening, setOpening] = useState(0);

  if (action !== given) {
    setGiven(action);
    if (action !== null) {
      setShown(action);
      setOpening((count) => count + 1);
    }
  }

  return [shown, opening, setShown];
}
