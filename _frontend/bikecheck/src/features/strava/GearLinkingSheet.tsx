// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import {
  Button,
  Drawer,
  Group,
  Loader,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { inputStyles, dropdownProps } from "../add_bike_page/formStyles";
import { tapFeedback } from "@/utils/haptics";
import { useGearLinking, useLinkStravaGear } from "./strava.queries";
import type { GearLink, GearLinkingBike } from "./strava.types";
import BikecheckMark from "@/assets/icons/bikecheck/onlylogo.svg?react";
import StravaMark from "@/assets/icons/bikecheck/strava.svg?react";

interface GearLinkingSheetProps {
  opened: boolean;
  onClose: () => void;
  // Which bikes to offer. Undefined means every bike without a gear id — that is
  // what the automatic triggers want; the bike detail passes a single id.
  bikeIds?: number[];
}

// Falls back through the names a bike can have, so a row is never blank.
function bikeLabel(bike: GearLinkingBike): string {
  if (bike.bikename !== null && bike.bikename.trim() !== "")
    return bike.bikename;
  return [bike.bike_brand, bike.bike_model]
    .filter((part) => part !== null && part !== "")
    .join(" ");
}

// Pairs BikeCheck bikes with Strava gear. One row per bike: the bike on the
// left, a gear picker on the right. A gear belongs to one bike at a time, so
// gear taken by another bike is offered disabled rather than hidden — hiding it
// leaves the user wondering where their bike went.
export function GearLinkingSheet({
  opened,
  onClose,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used again once the mock goes
  bikeIds,
}: GearLinkingSheetProps): ReactElement {
  const { t } = useTranslation();
  const { data, isLoading } = useGearLinking(opened);
  const link = useLinkStravaGear();
  // Bike id -> chosen gear id. Seeded from what is already stored, so reopening
  // the sheet shows the current pairing rather than an empty picker.
  // Only what the user has touched. Anything absent falls back to what is stored,
  // so the sheet always opens showing the current pairing without an effect to
  // copy the fetched data into state.
  const [changed, setChanged] = useState<Record<number, string | null>>({});

  function chosenFor(bike: GearLinkingBike): string | null {
    return bike.id in changed ? changed[bike.id] : bike.strava_gear_id;
  }

  // TEMPORARY: the bikeIds filter is bypassed while the sheet is styled against
  // mock data, whose ids never match the real bike a caller asks for. Restore the
  // commented line when useGearLinking goes back to the real endpoint.
  const rows = (data?.bikecheck_bikes ?? []).filter(
    (bike) => bike.strava_gear_id === null,
  );
  // const rows = (data?.bikecheck_bikes ?? []).filter((bike) =>
  //   bikeIds !== undefined ? bikeIds.includes(bike.id) : bike.strava_gear_id === null,
  // );

  // Gear held by a bike that is not being edited here, so it cannot be taken.
  function takenBy(gearId: string): string | null {
    const owner = (data?.bikecheck_bikes ?? []).find(
      (bike) =>
        chosenFor(bike) === gearId && !rows.some((row) => row.id === bike.id),
    );
    return owner ? bikeLabel(owner) : null;
  }

  function submit(): void {
    // Only rows the user actually changed: resending an unchanged pairing would
    // rewrite what is already right, and an untouched empty row would unpair a
    // bike nobody asked about.
    const links: GearLink[] = rows
      .filter((bike) => chosenFor(bike) !== bike.strava_gear_id)
      .map((bike) => ({
        bikecheckBikeId: bike.id,
        stravaBikeId: chosenFor(bike),
      }));

    if (links.length === 0) {
      onClose();
      return;
    }
    link.mutate(links, { onSuccess: onClose });
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      // Height, not width, for a bottom drawer — enough that the sheet reads as
      // its own surface rather than a strip along the edge.
      size="55%"
      radius="md"
      title={t("strava.gearLinkingTitle")}
      // Darkened and blurred so the garage behind reads as out of reach while
      // the sheet is up, rather than competing with it for attention.
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      // Keyed by Drawer part, not by CSS property. The header carries its own
      // background, so it has to be painted alongside the content or it stays a
      // light band above the sheet.
      styles={{
        content: {
          backgroundColor: "var(--mantine-color-cards-6)",
          display: "flex",
          flexDirection: "column",
        },
        header: { backgroundColor: "var(--mantine-color-cards-6)" },
        // The body takes the leftover height so the buttons can sit at the
        // bottom edge whatever the list above them measures.
        body: {
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        },
        title: {
          fontWeight: 600,
          color: "var(--mantine-color-text-6)",
          // The close button sits beside it, so centring needs the title to
          // take the full row and centre its own text.
          flex: 1,
          textAlign: "center",
        },
      }}
    >
      <Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
        <Text size="sm" c="text.7">
          {t("strava.gearLinkingBody")}
        </Text>

        {isLoading && <Loader size="sm" />}

        {/* Strava gear is created by hand on Strava, so an account with none is
            a normal state, not an error. */}
        {!isLoading && data !== undefined && data.strava_bikes.length === 0 && (
          <Text size="sm" c="text.7">
            {t("strava.gearLinkingNoGear")}
          </Text>
        )}

        {/* Names the two sides of every row below, so it is clear which way the
            pairing runs: a bike on the left, the Strava gear it collects on the
            right. */}
        {data !== undefined &&
          data.strava_bikes.length > 0 &&
          rows.length > 0 && (
            <Group gap="sm" wrap="nowrap" align="center">
              <Group gap={6} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                <BikecheckMark
                  width={16}
                  height={16}
                  style={{ color: "var(--mantine-color-primary-6)" }}
                />
                <Text size="xs" tt="uppercase" fw={600} c="text.7">
                  {t("strava.gearLinkingColumnBike")}
                </Text>
              </Group>
              <Group gap={6} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                <StravaMark
                  width={16}
                  height={16}
                  color="var(--mantine-color-strava-6)"
                />
                <Text size="xs" tt="uppercase" fw={600} c="text.7">
                  {t("strava.gearLinkingColumnGear")}
                </Text>
              </Group>
            </Group>
          )}

        {data !== undefined &&
          data.strava_bikes.length > 0 &&
          rows.map((bike) => {
            const chosen = chosenFor(bike);
            return (
              <Group key={bike.id} gap="sm" wrap="nowrap" align="center">
                <Text
                  size="sm"
                  fw={600}
                  c="text.6"
                  style={{ flex: 1, minWidth: 0 }}
                  truncate
                >
                  {bikeLabel(bike)}
                </Text>
                <Select
                  value={chosen}
                  onChange={(value) =>
                    setChanged((current) => ({ ...current, [bike.id]: value }))
                  }
                  placeholder={t("strava.gearLinkingPlaceholder")}
                  data={data.strava_bikes.map((gear) => {
                    const owner = takenBy(gear.id);
                    return {
                      value: gear.id,
                      label:
                        owner === null
                          ? gear.name
                          : t("strava.gearTakenBy", {
                              name: gear.name,
                              bike: owner,
                            }),
                      disabled: owner !== null,
                    };
                  })}
                  // The wizard's field look, so a Strava field reads like any
                  // other form field in the app. The dropdown and its options
                  // are parts of Select, so they are styled here too — passing
                  // them through comboboxProps has no effect.
                  styles={inputStyles}
                  rightSection={link.isPending && <Loader size="xs" />}
                  rightSectionWidth={link.isPending ? 24 : undefined}
                  style={{ flex: 1, minWidth: 0 }}
                  radius="sm"
                  comboboxProps={dropdownProps}
                />
              </Group>
            );
          })}

        {link.isError && (
          <Text size="xs" c="red.5">
            {t("strava.gearLinkingFailed")}
          </Text>
        )}

        {/* Pushed to the bottom edge, then cleared of the Android navigation bar:
            without the inset the button sits under the system gesture area.
            Dismissing without pairing is the header close button's job, so the
            one action here is the one that commits. */}
        <Button
          fullWidth
          radius="sm"
          mt="auto"
          mb="var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px))"
          loading={link.isPending}
          disabled={rows.length === 0}
          onClick={() => {
            void tapFeedback();
            submit();
          }}
        >
          {t("strava.gearLinkingConfirm")}
        </Button>
      </Stack>
    </Drawer>
  );
}
