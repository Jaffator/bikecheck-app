// Pairs several bikes at once: one card per bike, one open at a time, name matches preselected.
import { useState, type CSSProperties, type ReactElement } from "react";
import {
  Anchor,
  Box,
  Button,
  Group,
  Loader,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ChevronDown, TriangleAlert } from "lucide-react";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import {
  nextOpenBike,
  suggestChoices,
  type GearChoices,
} from "../multiGearPairing";
import { useGearLinking } from "../strava.queries";
import type {
  GearLink,
  GearLinkingBike,
  GearLinkingData,
  StravaBike,
} from "../strava.types";
import { GearOption } from "./SingleGearSheet";

interface MultiGearSheetProps {
  opened: boolean;
  onClose: () => void;
  onPair: (links: GearLink[]) => void;
}

// Capped height with a flex body, so the card list scrolls and the footer stays put.
const SHEET_STYLES = {
  content: {
    display: "flex",
    flexDirection: "column",
    height: "auto",
    maxHeight: "85dvh",
  },
  body: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
} satisfies Record<string, CSSProperties>;

// Who holds a gear: a saved pairing, or a pick made in this sheet.
interface GearHolder {
  bike: string;
  key: string;
}

export function MultiGearSheet({
  opened,
  onClose,
  onPair,
}: MultiGearSheetProps): ReactElement {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useGearLinking(opened);

  return (
    <ResponsiveSheet
      opened={opened}
      onClose={onClose}
      desktop="modal"
      modalSize="md"
      withCloseButton
      styles={SHEET_STYLES}
    >
      <Stack gap="md" pt={4} style={{ flex: 1, minHeight: 0 }}>
        <Stack gap={4} pr={36}>
          <Text fz={19} fw={700} c="text.6" lh={1.25}>
            {t("strava.pairBikesTitle")}
          </Text>
          <Text fz={13} c="var(--color-text-dim)">
            {t("strava.pairBikesBody")}
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

        {data !== undefined && data.strava_bikes.length === 0 && (
          <Text size="sm" c="text.7">
            {t("strava.gearLinkingNoGear")}
          </Text>
        )}

        {data !== undefined && data.strava_bikes.length > 0 && (
          <PairingCards data={data} onClose={onClose} onPair={onPair} />
        )}
      </Stack>
    </ResponsiveSheet>
  );
}

interface PairingCardsProps {
  data: GearLinkingData;
  onClose: () => void;
  onPair: (links: GearLink[]) => void;
}

function PairingCards({
  data,
  onClose,
  onPair,
}: PairingCardsProps): ReactElement {
  const { t } = useTranslation();
  const rows = data.bikecheck_bikes.filter(
    (bike) => bike.strava_gear_id === null,
  );
  const paired = data.bikecheck_bikes.filter(
    (bike) => bike.strava_gear_id !== null,
  );

  const suggestions = suggestChoices(
    rows,
    data.strava_bikes,
    new Set(paired.map((bike) => bike.strava_gear_id as string)),
  );
  // Null until the owner touches a card, so the suggestions stand in without an effect.
  const [edited, setEdited] = useState<GearChoices | null>(null);
  const choices = edited ?? suggestions;
  // Undefined until a card is toggled: the first bike without gear opens by itself.
  const [toggled, setToggled] = useState<number | null | undefined>(undefined);
  const openId =
    toggled === undefined ? nextOpenBike(rows, choices, null) : toggled;

  const chosenCount = rows.filter((bike) => choices[bike.id] != null).length;

  function choose(bikeId: number, gearId: string | null): void {
    const next = { ...choices, [bikeId]: gearId };
    setEdited(next);
    setToggled(nextOpenBike(rows, next, bikeId));
  }

  // Saved pairings and this sheet's picks, minus the bike asking.
  function holdersFor(bikeId: number): Map<string, GearHolder> {
    const holders = new Map<string, GearHolder>();
    for (const bike of paired) {
      holders.set(bike.strava_gear_id as string, {
        bike: bikeTitle(bike),
        key: "strava.gearTakenShort",
      });
    }
    for (const bike of rows) {
      const gearId = choices[bike.id];
      if (bike.id !== bikeId && gearId != null) {
        holders.set(gearId, {
          bike: bikeTitle(bike),
          key: "strava.pairBikesTakenBy",
        });
      }
    }
    return holders;
  }

  function submit(): void {
    const links = rows
      .filter((bike) => choices[bike.id] != null)
      .map((bike) => ({
        bikecheckBikeId: bike.id,
        stravaBikeId: choices[bike.id] as string,
        stravaBikeName:
          data.strava_bikes.find((gear) => gear.id === choices[bike.id])
            ?.name ?? null,
      }));
    onPair(links);
  }

  return (
    <>
      {/* Only the cards scroll, so the buttons stay in reach. */}
      <Stack gap={10} style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {rows.map((bike) => (
          <BikeCard
            key={bike.id}
            bike={bike}
            gear={data.strava_bikes}
            chosen={choices[bike.id] ?? null}
            suggested={suggestions[bike.id] ?? null}
            holders={holdersFor(bike.id)}
            open={openId === bike.id}
            onToggle={() => setToggled(openId === bike.id ? null : bike.id)}
            onChoose={(gearId) => choose(bike.id, gearId)}
          />
        ))}

        <Anchor
          href={t("strava.gearLinkStrava")}
          target="_blank"
          rel="noreferrer"
          fz={13}
          c="var(--color-text-dim)"
        >
          {t("strava.gearMissing")}
        </Anchor>
      </Stack>

      <Stack gap={10} pt="xs" style={{ flexShrink: 0 }}>
        <Text fz={12} c="var(--color-text-dim)" ta="center">
          {t("strava.pairBikesSummary", {
            count: chosenCount,
            total: rows.length,
          })}
        </Text>
        <Group grow gap="sm">
          <Button variant="outline" radius="md" h={48} onClick={onClose}>
            {t("strava.gearLinkingSkip")}
          </Button>
          <Button
            radius="md"
            h={48}
            c="textDark.6"
            disabled={chosenCount === 0}
            onClick={submit}
            style={{ flex: 2 }}
          >
            {t("strava.pairBikesConfirm", { count: chosenCount })}
          </Button>
        </Group>
      </Stack>
    </>
  );
}

interface BikeCardProps {
  bike: GearLinkingBike;
  gear: StravaBike[];
  chosen: string | null;
  suggested: string | null;
  holders: Map<string, GearHolder>;
  open: boolean;
  onToggle: () => void;
  onChoose: (gearId: string | null) => void;
}

// A bike's card: closed it names the pick, open it lists the Strava gear.
function BikeCard({
  bike,
  gear,
  chosen,
  suggested,
  holders,
  open,
  onToggle,
  onChoose,
}: BikeCardProps): ReactElement {
  const { t } = useTranslation();
  const chosenName =
    gear.find((candidate) => candidate.id === chosen)?.name ?? null;

  return (
    <Box
      style={{
        borderRadius: 14,
        backgroundColor: "var(--color-surface-raised)",
        boxShadow:
          !open && chosen !== null
            ? "inset 0 0 0 1.5px var(--mantine-color-primary-6)"
            : undefined,
      }}
    >
      <UnstyledButton
        onClick={onToggle}
        aria-expanded={open}
        className="hover-veil"
        mih={56}
        px={14}
        w="100%"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderRadius: 14,
        }}
      >
        <Text
          fz={15}
          fw={700}
          c="text.6"
          lineClamp={1}
          style={{ flex: 1, minWidth: 0 }}
        >
          {bikeTitle(bike)}
        </Text>
        {open ? (
          <Text fz={12} c="var(--color-text-dim)" style={{ flexShrink: 0 }}>
            {t("strava.pairBikesPickFromStrava")}
          </Text>
        ) : (
          <Group
            gap={6}
            wrap="nowrap"
            style={{ flexShrink: 0, maxWidth: "45%" }}
          >
            {chosenName !== null && (
              <StravaMark
                width={12}
                height={12}
                color="var(--mantine-color-strava-6)"
              />
            )}
            <Text
              fz={13}
              fw={chosenName !== null ? 600 : 400}
              c={chosenName !== null ? "text.6" : "var(--color-text-dim)"}
              truncate
            >
              {chosenName ?? t("strava.pairBikesPick")}
            </Text>
            <ChevronDown
              size={14}
              color="var(--color-text-dim)"
              style={{ flexShrink: 0 }}
            />
          </Group>
        )}
      </UnstyledButton>

      {open && (
        <Stack
          gap={8}
          p={8}
          pt={0}
          role="radiogroup"
          aria-label={bikeTitle(bike)}
        >
          {gear.map((candidate) => {
            const holder = holders.get(candidate.id);
            return (
              <GearOption
                key={candidate.id}
                name={candidate.name}
                selected={candidate.id === chosen}
                takenBy={holder?.bike ?? null}
                takenKey={holder?.key}
                suggested={candidate.id === suggested}
                onPick={() => onChoose(candidate.id)}
              />
            );
          })}
          <UnstyledButton
            role="radio"
            aria-checked={chosen === null}
            onClick={() => onChoose(null)}
            className="hover-veil"
            mih={44}
            px={14}
            style={{ borderRadius: "var(--mantine-radius-md)" }}
          >
            <Text fz={14} c="var(--color-text-dim)">
              {t("strava.pairBikesLeave")}
            </Text>
          </UnstyledButton>
        </Stack>
      )}
    </Box>
  );
}
