// The phone's check-in drawer: opens when a new ride has arrived and walks the recent rides without one.
import { useEffect, useState, type ReactElement } from "react";
import { ActionIcon, Button, Group, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { Eyebrow } from "@/components/Eyebrow";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { disabledButtonStyles } from "@/features/add_bike_page/formStyles";
import { checkInOf, draftOf, type CheckInDraft } from "@/features/rides/checkIn";
import { formatDuration } from "@/features/rides/rideDuration";
import {
  CHECK_IN_PROMPT_KEY,
  useCheckInPrompt,
  useMarkCheckInPromptSeen,
  useSaveRideCheckIn,
} from "@/features/rides/rides.queries";
import type { Ride } from "@/features/rides/rides.types";
import { CheckInForm } from "./CheckInForm";

// Above the page's own sheets, which sit at 320.
const DRAWER_Z_INDEX = 330;

export function CheckInPromptDrawer(): ReactElement {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: prompt } = useCheckInPrompt();
  const { mutate: markSeen } = useMarkCheckInPromptSeen();
  const save = useSaveRideCheckIn();
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
  const toSave = checkInOf(draft);

  function next(): void {
    if (position + 1 >= queue.length) {
      setOpened(false);
      return;
    }
    setPosition(position + 1);
    setDraft(draftOf(null));
  }

  function submit(): void {
    if (ride === null || toSave === null) return;
    save.mutate(
      { rideId: ride.id, checkIn: toSave },
      {
        onSuccess: next,
        onError: () => notifications.show({ color: "red.5", message: t("checkIn.saveFailed") }),
      },
    );
  }

  return (
    <ResponsiveSheet
      opened={opened}
      onClose={() => setOpened(false)}
      desktop="modal"
      withCloseButton={false}
      zIndex={DRAWER_Z_INDEX}
      styles={{ content: { height: "auto", maxHeight: "88dvh" } }}
    >
      {ride !== null && (
        <Stack gap="md" pb="calc(1rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Stack gap={4} style={{ minWidth: 0 }}>
              <Eyebrow>
                {ride.started_at === null ? ride.bike_name : dayjs(ride.started_at).format("D. M. YYYY · HH:mm")}
              </Eyebrow>
              <Text fw={700} fz={22} c="text.6" lh={1.1}>
                {t("checkIn.question")}
                <Text span inherit c="var(--color-text-dim)" className="tabular-nums">
                  {" · "}
                  {t("checkIn.counter", { index: position + 1, total: queue.length })}
                </Text>
              </Text>
              <Text fz={13} c="var(--color-text-dim)" lineClamp={1} className="tabular-nums">
                {rideSummary(ride, t("pendingRides.distance", { count: Math.round((ride.distance_m ?? 0) / 1000) }))}
              </Text>
            </Stack>
            <ActionIcon
              variant="subtle"
              color="gray"
              radius="xl"
              size="lg"
              aria-label={t("action.close")}
              onClick={() => setOpened(false)}
            >
              <X size={20} color="var(--mantine-color-text-6)" />
            </ActionIcon>
          </Group>

          <CheckInForm draft={draft} onChange={setDraft} />

          <Group gap="sm" grow>
            <Button variant="outline" radius="md" size="md" onClick={next}>
              {t("checkIn.skip")}
            </Button>
            <Button
              color="primary.6"
              c="textDark.6"
              radius="md"
              size="md"
              disabled={toSave === null}
              loading={save.isPending}
              styles={disabledButtonStyles}
              onClick={submit}
            >
              {t("checkIn.save")}
            </Button>
          </Group>
        </Stack>
      )}
    </ResponsiveSheet>
  );
}

// Name · distance · time · climb, the way the ride is remembered.
function rideSummary(ride: Ride, distance: string): string {
  return [ride.name, distance, formatDuration(ride.duration_min ?? 0), `${ride.elevation_up_m ?? 0} m ↑`]
    .filter((part) => part !== "")
    .join(" · ");
}
