// Pairs one bike with its Strava gear: a list to pick from, the likely one already chosen.
import { useState, type ReactElement } from "react";
import { Anchor, Button, Group, Loader, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { TriangleAlert } from "lucide-react";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { suggestGear } from "../gearSuggestion";
import { useGearLinking, useLinkStravaGear } from "../strava.queries";

interface SingleGearSheetProps {
  opened: boolean;
  onClose: () => void;
  bikeId: number;
}

export function SingleGearSheet({ opened, onClose, bikeId }: SingleGearSheetProps): ReactElement {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useGearLinking(opened);
  const link = useLinkStravaGear();
  // Undefined until the owner picks, so the suggestion stands in without being copied into state.
  const [picked, setPicked] = useState<string | undefined>(undefined);

  const bike = data?.bikecheck_bikes.find((candidate) => candidate.id === bikeId);
  const gear = data?.strava_bikes ?? [];
  // Gear another bike of the owner already answers to cannot be taken twice.
  const owners = new Map(
    (data?.bikecheck_bikes ?? [])
      .filter((other) => other.id !== bikeId && other.strava_gear_id !== null)
      .map((other) => [other.strava_gear_id as string, bikeTitle(other)]),
  );
  const suggested = bike === undefined ? null : suggestGear(bike, gear, new Set(owners.keys()));
  const chosen = picked ?? suggested?.id ?? null;

  function submit(): void {
    const selected = gear.find((candidate) => candidate.id === chosen);
    if (selected === undefined) return;
    link.mutate([{ bikecheckBikeId: bikeId, stravaBikeId: selected.id, stravaBikeName: selected.name }], {
      onSuccess: onClose,
    });
  }

  return (
    <ResponsiveSheet opened={opened} onClose={onClose} desktop="modal" modalSize="md" withCloseButton>
      <Stack gap="md" pt={4}>
        <Stack gap={4} pr={36}>
          <Text fz={19} fw={700} c="text.6" lh={1.25}>
            {t("strava.pairBikeTitle", { bike: bike === undefined ? "" : bikeTitle(bike) })}
          </Text>
          <Text fz={13} c="var(--color-text-dim)">
            {t("strava.pairBikeBody")}
          </Text>
        </Stack>

        {isLoading && <Loader size="sm" />}

        {isError && (
          <Group gap="sm" wrap="nowrap">
            <TriangleAlert color="var(--mantine-color-red-6)" />
            <Text size="sm" c="red.5">
              {t("strava.gearLinkingLoadFailed")}
            </Text>
          </Group>
        )}

        {data !== undefined && gear.length === 0 && (
          <Text size="sm" c="text.7">
            {t("strava.gearLinkingNoGear")}
          </Text>
        )}

        {gear.length > 0 && (
          <Stack gap={8} role="radiogroup" aria-label={t("strava.gearLinkingColumnGear")}>
            {gear.map((candidate) => (
              <GearOption
                key={candidate.id}
                name={candidate.name}
                selected={candidate.id === chosen}
                takenBy={owners.get(candidate.id) ?? null}
                suggested={candidate.id === suggested?.id}
                onPick={() => setPicked(candidate.id)}
              />
            ))}
          </Stack>
        )}

        <Anchor href={t("strava.gearLinkStrava")} target="_blank" rel="noreferrer" fz={13} c="var(--color-text-dim)">
          {t("strava.gearMissing")}
        </Anchor>

        {link.isError && (
          <Text size="sm" c="red.5">
            {t("strava.gearLinkingFailed")}
          </Text>
        )}

        <Group grow gap="sm" mt="xs">
          <Button variant="outline" radius="md" h={48} onClick={onClose}>
            {t("strava.gearLinkingSkip")}
          </Button>
          <Button
            radius="md"
            h={48}
            c="textDark.6"
            loading={link.isPending}
            disabled={chosen === null}
            onClick={submit}
            style={{ flex: 2 }}
          >
            {t("strava.pair")}
          </Button>
        </Group>
      </Stack>
    </ResponsiveSheet>
  );
}

interface GearOptionProps {
  name: string;
  selected: boolean;
  // The title of the owner's other bike that already has this gear.
  takenBy: string | null;
  suggested: boolean;
  onPick: () => void;
}

function GearOption({ name, selected, takenBy, suggested, onPick }: GearOptionProps): ReactElement {
  const { t } = useTranslation();
  const taken = takenBy !== null;

  return (
    <UnstyledButton
      role="radio"
      aria-checked={selected}
      disabled={taken}
      onClick={onPick}
      className={taken ? undefined : "hover-veil"}
      mih={60}
      px={14}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderRadius: "var(--mantine-radius-md)",
        backgroundColor: "var(--color-surface-raised)",
        boxShadow: selected ? "inset 0 0 0 1.5px var(--mantine-color-primary-6)" : undefined,
        opacity: taken ? 0.5 : 1,
        cursor: taken ? "not-allowed" : "pointer",
      }}
    >
      <StravaMark
        width={14}
        height={14}
        color={taken ? "var(--color-text-dim)" : "var(--mantine-color-strava-6)"}
        style={{ flexShrink: 0 }}
      />
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Text fz={15} fw={600} c="text.6" lineClamp={1}>
          {name}
        </Text>
        {taken && (
          <Text fz={12} c="var(--color-text-dim)" lineClamp={1}>
            {t("strava.gearTakenShort", { bike: takenBy })}
          </Text>
        )}
      </Stack>
      {suggested && (
        <Text fz={11} fw={600} c="primary.6" style={{ flexShrink: 0 }}>
          {t("strava.gearByName")}
        </Text>
      )}
    </UnstyledButton>
  );
}
