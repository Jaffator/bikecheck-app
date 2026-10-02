// The check-in, a drawer on the phone and a modal on desktop: walks the newly arrived rides without a
// check-in and every recent one still without a bike. Nothing dismisses it; each is saved or skipped.
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
import { checkInQueueOf, woreOffOn, type CheckInItem } from "@/features/rides/checkInQueue";
import { checkInSaveOf, pickedOf, type BikePick, type CheckInSave } from "@/features/rides/checkInSave";
import { checkInSummaryOf } from "@/features/rides/rideSummary";
import {
  CHECK_IN_PROMPT_KEY,
  useChangeRideBike,
  useCheckInPrompt,
  useDismissRide,
  useMarkCheckInPromptSeen,
  useSaveRideCheckIn,
} from "@/features/rides/rides.queries";
import type { CheckInPrompt, WoreOffLine } from "@/features/rides/rides.types";
import { QUIET_COLOR } from "@/features/service_tracking/attentionLevel";
import { useDismissPendingRide, useResolvePendingRide } from "@/features/strava/strava.queries";
import { useIsDesktop } from "@/layout/breakpoints";
import { CheckInBikeField, type BikeSource } from "./CheckInBikeField";
import { CheckInForm } from "./CheckInForm";
import { RideSummaryCard } from "./RideSummaryCard";

dayjs.extend(relativeTime);

// Above the page's own sheets, which sit at 320.
const DRAWER_Z_INDEX = 330;

const NO_BIKE_ROUTE = "var(--mantine-color-text-8)";

const NO_PROMPT: CheckInPrompt = { rides: [], pending: [] };

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
  const changeBike = useChangeRideBike();
  const dismiss = useDismissRide();
  const resolve = useResolvePendingRide();
  const dismissPending = useDismissPendingRide();
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  // A snapshot: saving refreshes the prompt, and the walk must not shift under the rider.
  const [queue, setQueue] = useState<CheckInItem[]>([]);
  const [position, setPosition] = useState(0);
  const [draft, setDraft] = useState<CheckInDraft>(draftOf(null));
  // Null keeps the ride's own bike, or none for a pending ride; nothing is written until it is saved.
  const [pick, setPick] = useState<BikePick | null>(null);
  const [pickerOpened, setPickerOpened] = useState(false);

  const arrived = opened || prompt === undefined ? [] : checkInQueueOf(prompt);
  if (arrived.length > 0) {
    setOpened(true);
    setQueue(arrived);
    showRide(0);
  }

  // Seen as it opens, so another device or the next start stays shut until a new ride arrives.
  useEffect(() => {
    if (!opened) return;
    queryClient.setQueryData<CheckInPrompt>(CHECK_IN_PROMPT_KEY, NO_PROMPT);
    markSeen();
  }, [opened, queryClient, markSeen]);

  const item = queue[position] ?? null;

  function showRide(index: number): void {
    setPosition(index);
    setDraft(draftOf(null));
    setPick(null);
    setPickerOpened(false);
  }

  function next(): void {
    if (position + 1 >= queue.length) {
      setOpened(false);
      return;
    }
    showRide(position + 1);
  }

  async function submit(answer: CheckInSave): Promise<void> {
    if (await write(answer)) next();
  }

  // True once the ride is answered, so the walk may move on.
  async function write(answer: CheckInSave): Promise<boolean> {
    switch (answer.kind) {
      case "needsBike":
        return false;
      case "dismissRide":
        return succeeded(dismiss.mutateAsync(answer.rideId), "pendingRides.dismissFailed");
      case "dismissPending":
        return succeeded(dismissPending.mutateAsync(answer.activityId), "pendingRides.dismissFailed");
      case "save":
        return moveAndCheckIn(answer);
      case "resolve":
        return resolveAndCheckIn(answer);
    }
  }

  // The bike moves first, so the check-in lands on the ride where it now is. Both are optional.
  async function moveAndCheckIn({ rideId, moveTo, checkIn }: RideSave): Promise<boolean> {
    const moving = moveTo === null ? null : changeBike.mutateAsync({ rideId, bikeId: moveTo });
    if (moving !== null && !(await succeeded(moving, "rides.changeBikeFailed"))) return false;
    return checkIn === null || (await succeeded(save.mutateAsync({ rideId, checkIn }), "checkIn.saveFailed"));
  }

  // The check-in goes on the ride the pending one becomes. Once that exists the walk goes on even if
  // the check-in fails: resolving again would find nothing pending.
  async function resolveAndCheckIn({ activityId, bikeId, checkIn }: PendingSave): Promise<boolean> {
    const resolved = await attempt(resolve.mutateAsync({ activityId, bikeId }), "pendingRides.assignFailed");
    if (resolved === null) return false;
    if (checkIn !== null) await attempt(save.mutateAsync({ rideId: resolved.rideId, checkIn }), "checkIn.saveFailed");
    return true;
  }

  // A failed write keeps the rider on this ride, told why; null stands for the failure.
  async function attempt<T>(pending: Promise<T>, failedKey: string): Promise<T | null> {
    try {
      return await pending;
    } catch {
      notifications.show({ color: "red.5", message: t(failedKey) });
      return null;
    }
  }

  async function succeeded(pending: Promise<unknown>, failedKey: string): Promise<boolean> {
    return (await attempt(pending, failedKey)) !== null;
  }

  const picked = item === null ? null : pickedOf(item, pick);
  const pickedId = picked?.kind === "bike" ? picked.bikeId : null;
  const notMine = picked?.kind === "notMine";
  const answer = item === null ? null : checkInSaveOf(item, pick, checkInOf(draft));
  const step: PromptStep | null =
    item === null || answer === null
      ? null
      : {
          item,
          bikes: bikes ?? [],
          pickedBike: pickedId === null ? null : (bikes?.find((one) => one.id === pickedId) ?? null),
          notMine,
          source: sourceOf(item, picked),
          woreOff: woreOffOn(item, pickedId),
          fallbackName: item.kind === "ride" ? (item.ride.bike_name ?? t("rides.unknownBike")) : "",
          onPick: setPick,
          pickerOpened,
          onPickerOpenedChange: setPickerOpened,
          index: position,
          total: queue.length,
          draft,
          onDraft: setDraft,
          onSkip: next,
          onSave: () => void submit(answer),
          // A hidden check-in is not saved, so a half-filled one cannot hold the ride back.
          canSave: answer.kind !== "needsBike" && (notMine || !isHalfFilled(draft)),
          saving: [save, changeBike, dismiss, resolve, dismissPending].some((write) => write.isPending),
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

type RideSave = Extract<CheckInSave, { kind: "save" }>;
type PendingSave = Extract<CheckInSave, { kind: "resolve" }>;

function sourceOf(item: CheckInItem, picked: BikePick | null): BikeSource {
  if (picked === null) return "missing";
  const ownBike = item.kind === "ride" && picked.kind === "bike" && picked.bikeId === item.ride.bike_id;
  return ownBike ? "strava" : "byHand";
}

interface PromptStep {
  item: CheckInItem;
  bikes: ListedBike[];
  // Null while the garage loads, or with none of the rider's bikes picked.
  pickedBike: ListedBike | null;
  notMine: boolean;
  source: BikeSource;
  woreOff: WoreOffLine[];
  fallbackName: string;
  onPick: (pick: BikePick) => void;
  pickerOpened: boolean;
  onPickerOpenedChange: (opened: boolean) => void;
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
    <Stack gap="md">
      <Stack gap={4}>
        <ArrivedEyebrow createdAt={step.item.ride.created_at} />
        <Group gap={10} align="baseline" wrap="nowrap">
          <PromptTitle />
          <Counter step={step} />
        </Group>
      </Stack>
      <RideSummaryCard ride={checkInSummaryOf(step.item)} routeColor={routeColor(step)} />
      <BikeField step={step} />
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
          <ArrivedEyebrow createdAt={step.item.ride.created_at} />
          <PromptTitle />
        </Stack>
        <Counter step={step} />
      </Group>

      <Group align="stretch" gap={0} wrap="nowrap">
        <Box p={24} w={RIDE_COLUMN_WIDTH} style={RIDE_COLUMN}>
          <RideSummaryCard ride={checkInSummaryOf(step.item)} routeColor={routeColor(step)} detailed />
        </Box>
        <Stack gap={20} p={24} style={{ flex: 1, minWidth: 0 }}>
          <BikeField step={step} />
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
function ArrivedEyebrow({ createdAt }: { createdAt: string | null }): ReactElement {
  const { t } = useTranslation();
  const arrived = createdAt === null ? null : dayjs(createdAt).fromNow();

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

function BikeField({ step }: { step: PromptStep }): ReactElement {
  return (
    <CheckInBikeField
      bikes={step.bikes}
      picked={step.pickedBike}
      notMine={step.notMine}
      source={step.source}
      fallbackName={step.fallbackName}
      woreOff={step.woreOff}
      onPick={step.onPick}
      pickerOpened={step.pickerOpened}
      onPickerOpenedChange={step.onPickerOpenedChange}
    />
  );
}

// Dimmed and out of reach while the bike list lies over it or no bike is picked; gone with a ride
// that is not the rider's.
function CheckInSection({ step }: { step: PromptStep }): ReactElement | null {
  const { t } = useTranslation();
  if (step.notMine) return null;
  const locked = step.pickerOpened || step.source === "missing";
  return (
    <Stack gap={8} inert={locked} style={{ opacity: locked ? 0.4 : 1, transition: "opacity 150ms ease" }}>
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
  const withCheck = !step.notMine && step.source !== "missing";

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
        leftSection={withCheck ? <Check size={compact ? 16 : 18} strokeWidth={2.4} /> : undefined}
        disabled={!step.canSave}
        loading={step.saving}
        styles={disabledButtonStyles}
        style={compact ? undefined : { flex: 1 }}
        onClick={step.onSave}
      >
        {t(saveLabelKey(step))}
      </Button>
    </Group>
  );
}

function saveLabelKey(step: PromptStep): string {
  if (step.source === "missing") return "checkIn.pickBikeFirst";
  return step.notMine ? "checkIn.saveWithoutBike" : "checkIn.saveAndNext";
}

// The route in its bike's colour, grey on none; Strava orange until the garage loads.
function routeColor(step: PromptStep): string | undefined {
  if (step.notMine || step.source === "missing") return NO_BIKE_ROUTE;
  return step.pickedBike === null ? undefined : bikeColor(step.pickedBike.color_index);
}
