// UI component backed by Strava query hooks.
import { useState, type ReactElement } from "react";
import { Anchor, Button, Drawer, Group, Loader, Select, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { inputStyles, dropdownProps, disabledButtonStyles } from "../add_bike_page/formStyles";
import { useGearLinking, useLinkStravaGear } from "./strava.queries";
import type { GearLink, GearLinkingBike } from "./strava.types";
import { bikeTitle } from "@/features/bikes/bikeTitle";
// import BikecheckMark from "@/assets/icons/bikecheck/onlylogo.svg?react";
// import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";
import { StravaConnectBike } from "@/assets/icons/svg_icons/StravaConnectBike";
import { TbBikeOff } from "react-icons/tb";
import { Link2, TriangleAlert } from "lucide-react";

interface GearLinkingSheetProps {
  opened: boolean;
  onClose: () => void;
  // Undefined lists unpaired bikes; detail pages pass one id.
  bikeIds?: number[];
}

// Pair BikeCheck bikes with their Strava gear.
export function GearLinkingSheet({ opened, onClose, bikeIds }: GearLinkingSheetProps): ReactElement {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useGearLinking(opened);
  const link = useLinkStravaGear();
  // Keep only changes; untouched rows use their stored pairing.
  const [changed, setChanged] = useState<Record<number, string | null>>({});

  function chosenFor(bike: GearLinkingBike): string | null {
    return bike.id in changed ? changed[bike.id] : bike.strava_gear_id;
  }

  const rows = (data?.bikecheck_bikes ?? []).filter((bike) =>
    bikeIds !== undefined ? bikeIds.includes(bike.id) : bike.strava_gear_id === null,
  );

  // Excludes gear paired to another bike, including pending changes.
  function takenBy(gearId: string, forBikeId: number): string | null {
    const owner = (data?.bikecheck_bikes ?? []).find((bike) => bike.id !== forBikeId && chosenFor(bike) === gearId);
    return owner ? bikeTitle(owner) : null;
  }
  function submit(): void {
    // Submit only modified pairings.
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
      // Fits short lists and caps tall lists for scrolling.
      size="auto"
      radius="md"
      title={t("strava.gearLinkingTitle")}
      // Keeps background content visually inactive.
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      // Matches the header background to drawer content.
      styles={{
        content: {
          backgroundColor: "var(--mantine-color-cards-6)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "85dvh",
        },
        header: { backgroundColor: "var(--mantine-color-cards-6)" },
        // Pins actions below the scrollable list.
        body: {
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        },
        title: {
          fontWeight: 600,
          color: "var(--mantine-color-text-7)",
          // Centers independently of the close button.
          flex: 1,
          textAlign: "center",
        },
      }}
    >
      <div className="align-center mb-4 -ml-2 mt-5 flex w-full justify-center">
        <StravaConnectBike
          size={40}
          stravaColor="var(--mantine-color-strava-6)"
          stravaCircleColor="color-mix(in srgb, var(--mantine-color-strava-6) 20%, transparent)"
          connectColor="var(--mantine-color-text-6)"
          bikeColor="var(--mantine-color-cards-7)"
          bikeCircleColor="var(--mantine-color-primary-6)"
        />
      </div>
      <Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
        {/* <Text size="sm" c="text.7">
          {t("strava.gearLinkingBody")}
        </Text> */}

        {/* --------- LOADING --------- */}
        {isLoading && <Loader size="sm" />}

        {/* --------- LOAD ERROR --------- */}
        {isError && (
          <Group gap="sm" wrap="nowrap" align="center" mt={10}>
            <TriangleAlert color="var(--mantine-color-red-6)"></TriangleAlert>
            <Text size="sm" c="red.5">
              {t("strava.gearLinkingLoadFailed")}
            </Text>
          </Group>
        )}

        {/* --------- NO STRAVA GEAR --------- */}
        {!isLoading && data !== undefined && data.strava_bikes.length === 0 && (
          <Stack mt={20}>
            <Group gap="sm" wrap="nowrap" align="center">
              <TbBikeOff size={40} color="var(--mantine-color-cards-4)"></TbBikeOff>
              <Text size="sm" c="text.7">
                {t("strava.gearLinkingNoGear")}
              </Text>
            </Group>
            <Group gap="sm" wrap="nowrap" align="center">
              <Link2 size={25} color="var(--mantine-color-strava-6)"></Link2>
              <Anchor href={t("strava.gearLinkStrava")} target="_blank" rel="noreferrer" size="sm" c="text.6">
                {t("strava.gearLinkStrava")}
              </Anchor>
            </Group>
          </Stack>
        )}

        {/* --------- PAIRING HEADERS --------- */}
        {data !== undefined && data.strava_bikes.length > 0 && rows.length > 0 && (
          <Group gap="sm" wrap="nowrap" align="center" mt={15}>
            <Group gap={6} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
              {/* <BikecheckMark width={16} height={16} style={{ color: "var(--mantine-color-primary-6)" }} /> */}
              {/* <Text size="xs" tt="uppercase" fw={600} c="text.7">
                {t("strava.gearLinkingColumnBike")}
              </Text> */}
            </Group>
            {/* <Group gap={6} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
              <StravaMark width={16} height={16} color="var(--mantine-color-strava-6)" />
              <Text size="xs" tt="uppercase" fw={600} c="text.7">
                {t("strava.gearLinkingColumnGear")}
              </Text>
            </Group> */}
          </Group>
        )}

        {/* --------- PAIRING ROWS --------- */}
        <Stack gap="md" style={{ overflowY: "auto", minHeight: 0 }}>
          {data !== undefined &&
            data.strava_bikes.length > 0 &&
            rows.map((bike) => {
              const chosen = chosenFor(bike);
              return (
                <Group key={bike.id} gap="sm" wrap="nowrap" align="center">
                  <Text size="sm" fw={600} c="text.6" style={{ flex: 1, minWidth: 0 }} truncate>
                    {bikeTitle(bike)}
                  </Text>
                  <Select
                    value={chosen}
                    onChange={(value) =>
                      setChanged((current) => ({
                        ...current,
                        [bike.id]: value,
                      }))
                    }
                    placeholder={t("strava.gearLinkingPlaceholder")}
                    data={data.strava_bikes.map((gear) => {
                      const owner = takenBy(gear.id, bike.id);
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
                    // Reuses the wizard input style.
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
        </Stack>

        {/* --------- SAVE ERROR --------- */}
        {link.isError && (
          <Text size="sm" c="red.5">
            {t("strava.gearLinkingFailed")}
          </Text>
        )}

        {/* Keeps confirmation above the Android gesture area. */}
        <Button
          fullWidth
          radius="sm"
          mt="auto"
          mb="var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px))"
          loading={link.isPending}
          disabled={rows.length === 0}
          // Reuses the wizard disabled state.
          styles={disabledButtonStyles}
          style={{ height: "3rem" }}
          onClick={() => {
            submit();
          }}
        >
          {t("strava.gearLinkingConfirm")}
        </Button>
      </Stack>
    </Drawer>
  );
}
