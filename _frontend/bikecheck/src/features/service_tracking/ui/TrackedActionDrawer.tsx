// One Tracked Action in full: the reading the row showed, the one button that records the
// Action, and what had nowhere else to live — the day it is planned for, the Service Interval it
// is measured against, and whether it announces itself (ADR 0032, ADR 0034, ADR 0038).
// Opened from the bike's own page and from the dashboard alike, so a row that looks the
// same behaves the same wherever it is met.
import { useEffect, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { ActionIcon, Box, Button, Group, NumberInput, SimpleGrid, Stack, Switch, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Bell, CalendarDays, ChevronRight, History, Minus, Plus, RotateCcw, X } from "lucide-react";
import Bikecheck from "@/assets/icons/bikecheck/bikecheck.svg?react";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { measureLabel } from "@/features/components/componentLabels";
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
import { PASSED_PLAN_COLOR, isPlanPassed, planDayLabel } from "@/features/service_tracking/plannedDay";
import { trackedActionServiceLink } from "@/features/service_tracking/serviceLink";
import { useSetTrackedActionInterval, useSetTrackedActionNotify } from "@/features/service_tracking/tracking.queries";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";
import { useIsDesktop } from "@/layout/breakpoints";
import { PlanSheet } from "./PlanSheet";
import { MODAL_PADDING } from "@/theme";

// The same layer every other sheet stands on, so overlays never fight the FAB.
const SHEET_Z_INDEX = 300;

// How long the stepper waits after the last touch before it writes. Long enough that five
// taps are one request rather than five, short enough not to feel like a pending save —
// and the write re-evaluates the whole bike and may announce, so the push lands on the
// number the owner actually stopped on.
const WRITE_DELAY_MS = 600;

const GROUP_STYLE: CSSProperties = {
  borderRadius: 16,
  overflow: "hidden",
  backgroundColor: "var(--color-surface-raised)",
};

const ICON_TILE_STYLE: CSSProperties = {
  width: 36,
  height: 36,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  borderRadius: 10,
  backgroundColor: "rgba(255, 255, 255, 0.05)",
  color: "var(--mantine-color-text-7)",
};

// Row padding, icon tile and gap: where a row's text starts.
const ROW_TEXT_INSET = 16 + 36 + 14;

// The stepper's ends and its field sit in one well.
const STEPPER_STYLE: CSSProperties = {
  borderRadius: 12,
  backgroundColor: "var(--color-surface-well)",
  border: "1px solid var(--color-border-raised)",
};

const STEPPER_INPUT_STYLES = {
  input: {
    height: 38,
    padding: 0,
    textAlign: "center",
    fontSize: 15,
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    color: "var(--mantine-color-text-6)",
  },
} as const;

interface TrackedActionDrawerProps {
  // Null closes the drawer.
  action: TrackedAction | null;
  onClose: () => void;
}

export function TrackedActionDrawer({ action, onClose }: TrackedActionDrawerProps): ReactElement {
  const [shown, opening, written] = useOpenedReading(action);
  const isDesktop = useIsDesktop();

  return (
    <ResponsiveSheet
      opened={action !== null}
      onClose={onClose}
      desktop="modal"
      // Wider than Mantine's default, so the part line and the bar read on one line.
      modalSize="lg"
      zIndex={SHEET_Z_INDEX}
      withCloseButton={false}
      styles={{
        // One reading is as tall as it is, so the sheet takes the height it needs and stops
        // short of covering the page it was opened from.
        content: {
          height: "auto",
          maxHeight: "95dvh",
          display: "flex",
          flexDirection: "column",
        },
        // The desktop modal pads its scroll instead; a bottom sheet takes the wrapper's padding.
        body: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", ...(isDesktop ? { padding: 0 } : {}) },
      }}
    >
      <Box
        p={isDesktop ? MODAL_PADDING : undefined}
        style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
      >
        {/* Keyed on the opening, so every one starts with a closed editor rather than
            however the last one was left. */}
        {shown !== null && <Body key={opening} action={shown} onWritten={written} onClose={onClose} />}
      </Box>
    </ResponsiveSheet>
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
  const [planning, setPlanning] = useState(false);

  const job = catalogueLabel(action.action_i18n_key, action.action_name, t);

  return (
    <Stack gap={24}>
      <Header action={action} job={job} onClose={onClose} />

      <ReadingCard action={action} />

      <Stack gap={10}>
        <Text fz={11} fw={600} tt="uppercase" lts="var(--tracking-label)" c="text.8" px={4}>
          {t("tracking.settingsTitle")}
        </Text>
        <Box style={GROUP_STYLE}>
          <PlanSetting
            action={action}
            onTap={() => {
              setPlanning(true);
            }}
          />
          <RowDivider />
          <IntervalSetting action={action} onWritten={onWritten} />
          <RowDivider />
          <AnnounceSetting action={action} onWritten={onWritten} />
        </Box>
      </Stack>

      <Button
        fullWidth
        h={48}
        fz={15}
        fw={600}
        color="primary.6"
        c="textDark.6"
        radius="md"
        leftSection={<Bikecheck width={22} height={14} aria-hidden />}
        onClick={() => {
          navigate(trackedActionServiceLink(action));
        }}
      >
        {t(action.replace_action ? "tracking.logReplacement" : "tracking.logService")}
      </Button>

      <PlanSheet
        action={planning ? action : null}
        onClose={() => {
          setPlanning(false);
        }}
        onWritten={onWritten}
      />
    </Stack>
  );
}

// The day the owner means to do the Action, or Not planned; the row opens the calendar.
function PlanSetting({ action, onTap }: { action: TrackedAction; onTap: () => void }): ReactElement {
  const { t, i18n } = useTranslation();
  const planned = action.planned_for;

  return (
    <SettingRow
      icon={<CalendarDays size={18} />}
      label={t("tracking.plannedFor")}
      badge={null}
      onTap={onTap}
      value={
        <Group gap={6} wrap="nowrap" align="center">
          {planned === null ? (
            <Text fz={14} c="text.7">
              {t("tracking.notPlanned")}
            </Text>
          ) : (
            <Text className="tabular-nums" fz={14} c={isPlanPassed(planned) ? PASSED_PLAN_COLOR : "text.7"}>
              {planDayLabel(planned, i18n.language)}
            </Text>
          )}
          <ChevronRight size={16} color="var(--mantine-color-text-8)" />
        </Group>
      }
      hint={<HintText>{t("tracking.planHint")}</HintText>}
      error={null}
    />
  );
}

// The job leads, because the drawer is about work waiting; the part's own name follows.
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
  const isDesktop = useIsDesktop();
  const desc = action.component_desc;

  return (
    <Group justify="space-between" wrap="nowrap" align="flex-start" gap="md">
      <Stack gap={6} style={{ minWidth: 0, flex: 1 }}>
        <Text fz={20} fw={600} c="text.6" lh={1.2} lts="var(--tracking-title)" lineClamp={2}>
          {job}
        </Text>
        {desc !== null && desc !== "" && (
          <Text fz={14} c="text.7" lh={1.3} lineClamp={2}>
            {desc}
          </Text>
        )}
      </Stack>

      {/* A bottom sheet wears the wrapper's ✕ in its corner. */}
      {isDesktop && (
        <ActionIcon
          variant="subtle"
          color="gray"
          radius="md"
          size={36}
          mt={-6}
          mr={-6}
          aria-label={t("action.close")}
          onClick={onClose}
          style={{ flexShrink: 0 }}
        >
          <X size={18} color="var(--mantine-color-text-8)" />
        </ActionIcon>
      )}
    </Group>
  );
}

// The same number and the same colour the row showed, what that level means, and then the two
// figures behind them: how far the part has come against the interval in force, and what is left.
function ReadingCard({ action }: { action: TrackedAction }): ReactElement {
  const { t, i18n } = useTranslation();
  const color = attentionColor(action.percentage);
  const unit = axisUnit(action.axis);
  // The unit lands once at the end, the way the row writes the same pair.
  const figure = (value: number): string => `${axisValue(action.axis, value, i18n.language)} ${unit}`.trim();
  const over = action.current - action.interval;

  return (
    <Stack gap={16} p={18} style={{ borderRadius: 16, backgroundColor: "var(--color-surface-raised)" }}>
      <Group justify="space-between" wrap="nowrap" align="flex-end" gap="md">
        <Stack gap={8} style={{ minWidth: 0 }}>
          <LevelBadge label={t(`bikes.health.${action.level}`)} color={color} />
          <Text fz={13} c="text.7" lineClamp={2}>
            {t(`tracking.levelNote.${action.level}`)}
          </Text>
        </Stack>
        <Text className="tabular-nums" fz={28} fw={700} c={color} lh={1} lts="var(--tracking-display)" style={{ flexShrink: 0 }}>
          {t("tracking.percentage", { value: action.percentage })}
        </Text>
      </Group>

      <Box aria-hidden h={6} style={{ borderRadius: 3, overflow: "hidden", backgroundColor: "var(--color-surface-well)" }}>
        <Box h="100%" w={`${String(barFill(action) * 100)}%`} style={{ borderRadius: 3, backgroundColor: color }} />
      </Box>

      <SimpleGrid cols={2} spacing={12}>
        {/* Named by the accumulator it was taken from, so suspension hours are never read as
            the bike's own and drivetrain kilometres never as the odometer's. */}
        <FigureTile label={measureLabel(action.measure, t)}>
          {axisValue(action.axis, action.current, i18n.language)}{" "}
          <Text span inherit c="text.8" fw={500}>
            / {figure(action.interval)}
          </Text>
        </FigureTile>
        {/* Past the interval nothing remains, so the tile says by how much it is over instead. */}
        {over > 0 ? (
          <FigureTile label={t("tracking.overBy")} color={color}>
            {figure(over)}
          </FigureTile>
        ) : (
          <FigureTile label={t("tracking.remaining")}>{figure(remainingWear(action))}</FigureTile>
        )}
      </SimpleGrid>
    </Stack>
  );
}

function LevelBadge({ label, color }: { label: string; color: string }): ReactElement {
  return (
    <Group
      gap={6}
      wrap="nowrap"
      h={24}
      px={10}
      style={{
        alignSelf: "flex-start",
        borderRadius: 9999,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
    >
      <Box w={6} h={6} style={{ borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
      <Text fz={11} fw={600} tt="uppercase" lts="var(--tracking-label)" c={color} style={{ whiteSpace: "nowrap" }}>
        {label}
      </Text>
    </Group>
  );
}

// One figure under the bar, on a tile of its own so the two read as a pair.
function FigureTile({ label, color, children }: { label: string; color?: string; children: ReactNode }): ReactElement {
  return (
    <Stack gap={4} px={12} py={10} style={{ minWidth: 0, borderRadius: 12, backgroundColor: "var(--mantine-color-cards-6)" }}>
      <Text fz={11} fw={500} tt="uppercase" lts="var(--tracking-label)" c="text.8" lineClamp={1}>
        {label}
      </Text>
      <Text className="tabular-nums" fz={16} fw={600} c={color ?? "text.6"} style={{ whiteSpace: "nowrap" }}>
        {children}
      </Text>
    </Stack>
  );
}

// The small mark that qualifies a reading: measured against the owner's own interval
// rather than the bike's plan.
function Pill({ label }: { label: string }): ReactElement {
  return (
    <Text
      className="tabular-nums"
      fz={9}
      tt="uppercase"
      c="primary.5"
      lts="var(--tracking-label)"
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
  const custom = action.interval_override !== null;

  return (
    <SettingRow
      icon={<History size={18} />}
      label={t("tracking.intervalLabel")}
      badge={custom ? t("tracking.intervalCustom") : null}
      onTap={null}
      value={
        <Group gap={0} wrap="nowrap" align="center" h={40} style={STEPPER_STYLE}>
          <StepButton
            label={t("tracking.intervalLess")}
            disabled={entered <= step}
            onClick={() => {
              setEntered((value) => Math.max(step, value - step));
            }}
          >
            <Minus size={16} />
          </StepButton>

          <NumberInput
            value={inAxisUnit(action.axis, entered)}
            min={1}
            allowNegative={false}
            allowDecimal={false}
            hideControls
            variant="unstyled"
            suffix={unit === "" ? undefined : ` ${unit}`}
            aria-label={t("tracking.intervalLabel")}
            styles={STEPPER_INPUT_STYLES}
            w={64}
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
            <Plus size={16} />
          </StepButton>
        </Group>
      }
      hint={
        <Group gap={4} wrap="nowrap" align="center">
          <HintText>{t(departureKey(departure), { percent: Math.abs(departure), value: plan })}</HintText>
          {/* Only where there is something to take back, and small on purpose: it undoes
              a year's worth of tapping in one go. */}
          {custom && (
            <ActionIcon
              variant="subtle"
              color="gray"
              radius="xl"
              size="sm"
              aria-label={t("tracking.intervalReset")}
              disabled={write.isPending}
              onClick={() => {
                setEntered(action.default_interval);
                save(null);
              }}
              style={{ flexShrink: 0 }}
            >
              <RotateCcw size={14} color="var(--mantine-color-text-8)" />
            </ActionIcon>
          )}
        </Group>
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

// One end of the joined stepper; the only colour on it is the sign itself.
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
      variant="subtle"
      color="primary.6"
      radius={11}
      size={38}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      // The well behind it stays visible when disabled, instead of the theme's grey fill.
      style={{ flexShrink: 0, backgroundColor: "transparent" }}
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
      icon={<Bell size={18} />}
      label={t("tracking.announceLabel")}
      badge={null}
      onTap={null}
      hint={<HintText>{t("tracking.announceBands")}</HintText>}
      value={
        <Switch
          size="md"
          withThumbIndicator={false}
          checked={action.notify}
          disabled={write.isPending}
          aria-label={t("tracking.announceLabel")}
          onChange={(event) => {
            change(event.currentTarget.checked);
          }}
          styles={{
            track: {
              backgroundColor: action.notify ? "var(--mantine-color-primary-6)" : "var(--color-border-raised)",
              borderColor: "transparent",
            },
            thumb: {
              backgroundColor: action.notify ? "var(--mantine-color-textDark-6)" : "var(--mantine-color-text-8)",
              borderColor: "transparent",
            },
          }}
        />
      }
      error={write.isError ? t("tracking.announceFailed") : null}
    />
  );
}

function HintText({ children }: { children: ReactNode }): ReactElement {
  return (
    <Text className="tabular-nums" fz={12} c="text.8" lh={1.35}>
      {children}
    </Text>
  );
}

// A hairline from the text's edge, not the icon's, as grouped settings lists draw it.
function RowDivider(): ReactElement {
  return <Box h={1} ml={ROW_TEXT_INSET} style={{ backgroundColor: "var(--color-border-subtle)" }} />;
}

// One control in the settings group: its icon, what it is with a line saying what it means, and
// what it stands at on the right. A row with nothing to tap is not a control at all — its own
// button is.
function SettingRow({
  icon,
  label,
  badge,
  value,
  onTap,
  hint,
  error,
}: {
  icon: ReactNode;
  label: string;
  // "Custom", where the owner has departed from the bike's plan.
  badge: string | null;
  value: ReactNode;
  onTap: (() => void) | null;
  hint: ReactNode;
  error: string | null;
}): ReactElement {
  const row = (
    <Box px={16} py={12}>
      <Group wrap="nowrap" gap={14} align="center" mih={40}>
        <Box style={ICON_TILE_STYLE}>{icon}</Box>
        <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
          <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
            <Text fz={14} fw={600} c="text.6" lineClamp={1}>
              {label}
            </Text>
            {badge !== null && <Pill label={badge} />}
          </Group>
          {hint}
        </Stack>
        <Box style={{ flexShrink: 0 }}>{value}</Box>
      </Group>
      {error !== null && (
        <Text fz={11} c="red.5" mt={6} ml={ROW_TEXT_INSET - 16}>
          {error}
        </Text>
      )}
    </Box>
  );

  if (onTap === null) return row;

  return (
    <Box
      role="button"
      tabIndex={0}
      className="hover-veil"
      onClick={onTap}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onTap();
      }}
    >
      {row}
    </Box>
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
