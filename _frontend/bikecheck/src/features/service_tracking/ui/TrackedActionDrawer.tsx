// One Tracked Action in full: the reading the row showed, the one button that records the
// job, and the two things about it that had nowhere else to live — the Service Interval it
// is measured against, and whether it announces itself (ADR 0032, ADR 0034).
// Opened from the bike's own page and from the dashboard alike, so a row that looks the
// same behaves the same wherever it is met.
import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { ActionIcon, Box, Button, Divider, Drawer, Group, NumberInput, Progress, Stack, Switch, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { inputStyles } from "@/features/add_bike_page/formStyles";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { measureLabel, positionLabel } from "@/features/components/componentLabels";
import { attentionColor, barFill } from "@/features/service_tracking/attentionLevel";
import {
  axisUnit,
  axisValue,
  fromAxisUnit,
  inAxisUnit,
  intervalDeparture,
  intervalInForce,
  intervalStep,
  remainingWear,
} from "@/features/service_tracking/intervalFigures";
import { trackedActionServiceLink } from "@/features/service_tracking/serviceLink";
import { useSetTrackedActionInterval, useSetTrackedActionNotify } from "@/features/service_tracking/tracking.queries";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";

// The same layer every other sheet stands on, so overlays never fight the FAB.
const SHEET_Z_INDEX = 300;

// How long the stepper waits after the last touch before it writes. Long enough that five
// taps are one request rather than five, short enough not to feel like a pending save —
// and the write re-evaluates the whole bike and may announce, so the push lands on the
// number the owner actually stopped on.
const WRITE_DELAY_MS = 600;

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

        <Text className="font-mono" fz={22} fw={100} c={color} lh={1}>
          {t("tracking.percentage", { value: action.percentage })}
        </Text>
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

// The small mark that qualifies a reading: measured against the owner's own interval
// rather than the bike's plan.
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
// disagreeing with it. Minus and plus move it by a tenth of the bike's plan, which is the
// one honest control for "not yet" now that putting a job off is gone (ADR 0034).
function IntervalSetting({
  action,
  onWritten,
}: {
  action: TrackedAction;
  onWritten: (action: TrackedAction) => void;
}): ReactElement {
  const { t, i18n } = useTranslation();
  const write = useSetTrackedActionInterval();

  const saved = intervalInForce(action);
  const step = intervalStep(action);
  const unit = axisUnit(action.axis);
  // What the stepper stands at, in the unit the reading is stored in. Moves under the thumb
  // and is written behind it, so the control never waits on the network.
  const [entered, setEntered] = useState(saved);

  const save = (override: number | null): void => {
    write.mutate(
      {
        component_mounted_id: action.component_mounted_id,
        event_action_id: action.event_action_id,
        interval_override: override,
      },
      {
        onSuccess: onWritten,
        // Nothing was written, so the stepper goes back to what still stands rather than
        // showing a number the server never took.
        onError: () => {
          setEntered(saved);
        },
      },
    );
  };

  // One write for a run of taps, and for a run of keystrokes. The write re-evaluates the
  // bike and may announce, so it has to land on the number the owner stopped on.
  //
  // Nothing is scheduled while a write is in flight. Reset sets the field and clears the
  // override in one gesture, and without this the debounce would follow it by writing that
  // field back as an override worth exactly the bike's plan - undoing the reset.
  useEffect(() => {
    if (entered === saved || write.isPending) return;

    const timer = setTimeout(() => {
      save(entered);
    }, WRITE_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered, saved, write.isPending]);

  const departure = intervalDeparture({ ...action, interval_override: entered });
  const plan = `${axisValue(action.axis, action.default_interval, i18n.language)} ${unit}`.trim();

  return (
    <SettingRow
      label={t("tracking.intervalLabel")}
      badge={action.interval_override === null ? null : t("tracking.intervalCustom")}
      onTap={null}
      value={
        <Group gap={6} wrap="nowrap" align="center">
          <StepButton
            label={t("tracking.intervalLess")}
            disabled={entered <= step}
            onClick={() => {
              setEntered((value) => Math.max(step, value - step));
            }}
          >
            <Minus size={16} color="var(--mantine-color-primary-6)" />
          </StepButton>

          <NumberInput
            value={inAxisUnit(action.axis, entered)}
            min={1}
            allowNegative={false}
            allowDecimal={false}
            hideControls
            suffix={unit === "" ? undefined : ` ${unit}`}
            aria-label={t("tracking.intervalLabel")}
            styles={inputStyles}
            w={96}
            onChange={(value) => {
              const typed = Number(value);
              if (!Number.isFinite(typed) || typed < 1) return;
              setEntered(fromAxisUnit(action.axis, typed));
            }}
          />

          <StepButton
            label={t("tracking.intervalMore")}
            disabled={false}
            onClick={() => {
              setEntered((value) => value + step);
            }}
          >
            <Plus size={16} color="var(--mantine-color-primary-6)" />
          </StepButton>
        </Group>
      }
      hint={
        action.interval_override === null ? null : (
          <Group justify="space-between" wrap="nowrap" gap="sm" align="center" pb={12}>
            <Text fz={12} c="var(--color-text-dim)" lineClamp={2}>
              {t(departureKey(departure), { percent: Math.abs(departure), value: plan })}
            </Text>
            {/* Only where there is something to take back, and small on purpose: it undoes
                a year's worth of tapping in one go. */}
            <ActionIcon
              variant="subtle"
              color="gray"
              radius="xl"
              size="md"
              aria-label={t("tracking.intervalReset")}
              disabled={write.isPending}
              onClick={() => {
                setEntered(action.default_interval);
                save(null);
              }}
              style={{ flexShrink: 0 }}
            >
              <RotateCcw size={16} color="var(--color-text-dim)" />
            </ActionIcon>
          </Group>
        )
      }
      error={write.isError ? t("tracking.intervalFailed") : null}
    />
  );
}

// Which way the owner's interval departs from the bike's plan. Landing back on the plan is
// its own sentence: the override still stands, and saying "0 % longer" would read as a bug.
function departureKey(departure: number): string {
  if (departure > 0) return "tracking.intervalLonger";
  if (departure < 0) return "tracking.intervalShorter";
  return "tracking.intervalSameAsPlan";
}

// One end of the stepper. Quiet by default — the theme draws the outline, and the only
// colour on it is the sign itself.
function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}): ReactElement {
  return (
    <ActionIcon
      variant="outline"
      radius="md"
      size="lg"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={{ flexShrink: 0 }}
    >
      {children}
    </ActionIcon>
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
      hint={
        <Text fz={12} c="var(--color-text-dim)" pb={12}>
          {t("tracking.announceBands")}
        </Text>
      }
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
      error={write.isError ? t("tracking.announceFailed") : null}
    />
  );
}

// One control in the list under the button: what it is on the left, what it stands at on
// the right, and under both a line saying what the control means. A row with nothing to
// tap is not a control at all — its own button is.
function SettingRow({
  label,
  badge,
  value,
  onTap,
  hint,
  error,
}: {
  label: string;
  // "Custom", where the owner has departed from the bike's plan.
  badge: string | null;
  value: ReactNode;
  onTap: (() => void) | null;
  // What the control means, under it. Styled by the caller, because one row explains itself
  // in a sentence and the other in a sentence with a button on the end of it.
  hint: ReactNode;
  error: string | null;
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
      {hint}
      {error !== null && (
        <Text fz={11} c="red.5" pb={12}>
          {error}
        </Text>
      )}
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
