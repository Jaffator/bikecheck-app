// The check-in, a drawer on the phone and a modal on desktop: opens when a new ride has arrived and
// walks the recent rides without one. Nothing dismisses it; each ride is saved or skipped.
import { useEffect, useState, type CSSProperties, type ReactElement } from "react";
import { Box, Button, Group, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Check, RefreshCw } from "lucide-react";
import { Eyebrow } from "@/components/Eyebrow";
import { PANEL_HAIRLINE } from "@/components/panelRows";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { disabledButtonStyles } from "@/features/add_bike_page/formStyles";
import { bikeColor } from "@/features/bikes/bikeColors";
import { useBikes } from "@/features/bikes/bikes.queries";
import type { ListedBike } from "@/features/bikes/bikes.types";
import { checkInOf, draftOf, isHalfFilled, type CheckInDraft } from "@/features/rides/checkIn";
import { rideSummaryOf } from "@/features/rides/rideSummary";
import {
  CHECK_IN_PROMPT_KEY,
  useCheckInPrompt,
  useMarkCheckInPromptSeen,
  useSaveRideCheckIn,
} from "@/features/rides/rides.queries";
import type { Ride } from "@/features/rides/rides.types";
import { QUIET_COLOR } from "@/features/service_tracking/attentionLevel";
import { useIsDesktop } from "@/layout/breakpoints";
import { CheckInBikeField } from "./CheckInBikeField";
import { CheckInForm } from "./CheckInForm";
import { RideSummaryCard } from "./RideSummaryCard";

dayjs.extend(relativeTime);

// Above the page's own sheets, which sit at 320.
const DRAWER_Z_INDEX = 330;

// The desktop modal holds the ride and the answers side by side.
const MODAL_WIDTH = 920;
const RIDE_COLUMN_WIDTH = 340;

const PHONE_STYLES = { content: { height: "auto", maxHeight: "88dvh" } };
// The columns and the header's hairlines run to the modal's edges.
const DESKTOP_STYLES = { body: { padding: 0 } };

export function CheckInPromptDrawer(): ReactElement {
  const queryClient = useQueryClient();
  const isDesktop = useIsDesktop();
  const { data: prompt } = useCheckInPrompt();
  const { data: bikes } = useBikes();
  const { mutate: markSeen } = useMarkCheckInPromptSeen();
  const save = useSaveRideCheckIn();
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  // A snapshot: saving refreshes the prompt, and the walk must not shift under the rider.
  const [queue, setQueue] = useState<Ride[]>([]);
  const [position, setPosition] = useState(0);
  const [draft, setDraft] = useState<CheckInDraft>(draftOf(null));

  if (!opened && prompt !== undefined && prompt.length > 0) {
    setOpened(true);
    setQueue(prompt);
    setPosition(0);
    setDraft(draftOf(null));
  }

  // Seen as it opens, so another phone or the next start stays shut until a new ride arrives.
  useEffect(() => {
    if (!opened) return;
    queryClient.setQueryData<Ride[]>(CHECK_IN_PROMPT_KEY, []);
    markSeen();
  }, [opened, queryClient, markSeen]);

  const ride = queue[position] ?? null;

  function next(): void {
    if (position + 1 >= queue.length) {
      setOpened(false);
      return;
    }
    setPosition(position + 1);
    setDraft(draftOf(null));
  }

  // The check-in is optional: without one the ride stays as it is and the walk moves on.
  function submit(): void {
    const toSave = checkInOf(draft);
    if (ride === null) return;
    if (toSave === null) {
      next();
      return;
    }
    save.mutate(
      { rideId: ride.id, checkIn: toSave },
      {
        onSuccess: next,
        onError: () => notifications.show({ color: "red.5", message: t("checkIn.saveFailed") }),
      },
    );
  }

  const step: PromptStep | null =
    ride === null
      ? null
      : {
          ride,
          bike: bikes?.find((one) => one.id === ride.bike_id) ?? null,
          index: position,
          total: queue.length,
          draft,
          onDraft: setDraft,
          onSkip: next,
          onSave: submit,
          canSave: !isHalfFilled(draft),
          saving: save.isPending,
        };

  return (
    <ResponsiveSheet
      opened={opened}
      onClose={() => setOpened(false)}
      desktop="modal"
      modalSize={MODAL_WIDTH}
      withCloseButton={false}
      dismissible={false}
      zIndex={DRAWER_Z_INDEX}
      styles={isDesktop ? DESKTOP_STYLES : PHONE_STYLES}
    >
      {step !== null && (isDesktop ? <DesktopPrompt step={step} /> : <PhonePrompt step={step} />)}
    </ResponsiveSheet>
  );
}

interface PromptStep {
  ride: Ride;
  // Null while the garage loads.
  bike: ListedBike | null;
  index: number;
  total: number;
  draft: CheckInDraft;
  onDraft: (draft: CheckInDraft) => void;
  onSkip: () => void;
  onSave: () => void;
  canSave: boolean;
  saving: boolean;
}

function PhonePrompt({ step }: { step: PromptStep }): ReactElement {
  return (
    <Stack gap="md" pb="calc(1rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
      <Stack gap={4}>
        <ArrivedEyebrow ride={step.ride} />
        <Group gap={10} align="baseline" wrap="nowrap">
          <PromptTitle />
          <Counter step={step} />
        </Group>
      </Stack>
      <RideSummaryCard ride={rideSummaryOf(step.ride)} routeColor={routeColor(step.bike)} />
      <CheckInBikeField ride={step.ride} bike={step.bike} />
      <CheckInSection step={step} />
      <PromptActions step={step} compact={false} />
    </Stack>
  );
}

function DesktopPrompt({ step }: { step: PromptStep }): ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Group
        justify="space-between"
        wrap="nowrap"
        gap="md"
        px={24}
        pt={18}
        pb={16}
        style={{ borderBottom: PANEL_HAIRLINE }}
      >
        <Stack gap={4}>
          <ArrivedEyebrow ride={step.ride} />
          <PromptTitle />
        </Stack>
        <Counter step={step} />
      </Group>

      <Group align="stretch" gap={0} wrap="nowrap">
        <Box p={24} w={RIDE_COLUMN_WIDTH} style={RIDE_COLUMN}>
          <RideSummaryCard ride={rideSummaryOf(step.ride)} routeColor={routeColor(step.bike)} detailed />
        </Box>
        <Stack gap={20} p={24} style={{ flex: 1, minWidth: 0 }}>
          <CheckInBikeField ride={step.ride} bike={step.bike} />
          <CheckInSection step={step} />
        </Stack>
      </Group>

      <Group justify="space-between" wrap="nowrap" gap="md" px={24} py={14} style={{ borderTop: PANEL_HAIRLINE }}>
        <Text fz={13} c="var(--color-text-dim)">
          {t("checkIn.optionalHint")}
        </Text>
        <PromptActions step={step} compact />
      </Group>
    </Box>
  );
}

const RIDE_COLUMN: CSSProperties = {
  flexShrink: 0,
  backgroundColor: "var(--mantine-color-cards-7)",
  borderRight: PANEL_HAIRLINE,
};

// "Ze Stravy · před 4 minutami": when the ride arrived, which is what woke the drawer.
function ArrivedEyebrow({ ride }: { ride: Ride }): ReactElement {
  const { t } = useTranslation();
  const arrived = ride.created_at === null ? null : dayjs(ride.created_at).fromNow();

  return (
    <Group gap={6} wrap="nowrap">
      <RefreshCw size={12} strokeWidth={2.4} color={QUIET_COLOR} style={{ flexShrink: 0 }} />
      <Eyebrow>{[t("checkIn.fromStrava"), arrived].filter((part) => part !== null).join(" · ")}</Eyebrow>
    </Group>
  );
}

function PromptTitle(): ReactElement {
  const { t } = useTranslation();
  return (
    <Text fw={700} fz={22} c="text.6" lh={1.1} lts="var(--tracking-title)">
      {t("checkIn.newRide")}
    </Text>
  );
}

function Counter({ step }: { step: PromptStep }): ReactElement {
  const { t } = useTranslation();
  return (
    <Text fz={13} c="var(--color-text-dim)" className="tabular-nums" style={{ whiteSpace: "nowrap" }}>
      {t("checkIn.counter", { index: step.index + 1, total: step.total })}
    </Text>
  );
}

function CheckInSection({ step }: { step: PromptStep }): ReactElement {
  const { t } = useTranslation();
  return (
    <Stack gap={8}>
      <Group justify="space-between" align="baseline" gap="sm" wrap="nowrap">
        <Eyebrow>{t("checkIn.question")}</Eyebrow>
        <Text fz={13} c="var(--color-text-dim)">
          {t("checkIn.optional")}
        </Text>
      </Group>
      <CheckInForm draft={step.draft} onChange={step.onDraft} />
    </Stack>
  );
}

function PromptActions({ step, compact }: { step: PromptStep; compact: boolean }): ReactElement {
  const { t } = useTranslation();
  const size = compact ? "sm" : "md";

  return (
    <Group gap={8} wrap="nowrap" style={compact ? { flexShrink: 0 } : undefined}>
      {/* Held while a save runs, whose success moves on by itself. */}
      <Button
        variant="outline"
        radius="md"
        size={size}
        w={compact ? undefined : 112}
        disabled={step.saving}
        styles={disabledButtonStyles}
        onClick={step.onSkip}
      >
        {t("checkIn.skip")}
      </Button>
      <Button
        color="primary.6"
        c="textDark.6"
        radius="md"
        size={size}
        leftSection={<Check size={compact ? 16 : 18} strokeWidth={2.4} />}
        disabled={!step.canSave}
        loading={step.saving}
        styles={disabledButtonStyles}
        style={compact ? undefined : { flex: 1 }}
        onClick={step.onSave}
      >
        {t("checkIn.saveAndNext")}
      </Button>
    </Group>
  );
}

// The route in its bike's colour; Strava orange until the garage loads.
function routeColor(bike: ListedBike | null): string | undefined {
  return bike === null ? undefined : bikeColor(bike.color_index);
}
