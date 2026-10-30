// PROTOTYPE (proto/desktop-wizards): the add-bike wizard on desktop - steps on the left, "Tvoje kolo" on the right.
// Design: "BikeCheck desktop redesign" canvas.
import { useEffect, type ReactElement } from "react";
import { Box, Button, Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check } from "lucide-react";
import { GearLinkingSheet } from "@/features/strava/ui/GearLinkingSheet";
import { PhotoCropModal } from "../PhotoCropModal";
import { StravaConnectScreen } from "../StravaConnectScreen";
import { useAddBikeWizard } from "../useAddBikeWizard";
import { BikeAsidePrototype } from "./BikeAsidePrototype";
import { BikePartsDesktop } from "./BikePartsDesktop";
import { BikeSearchDesktop } from "./BikeSearchDesktop";
import { BikeSpecDesktop } from "./BikeSpecDesktop";
import { BikeSummaryDesktop } from "./BikeSummaryDesktop";
import { cardSurface } from "./bikeProto";

const STEP_TITLE_KEYS = ["addBike.searchTitle", "addBike.specTitle", "addBike.partsTitle"];
const STEP_LABEL_KEYS = ["addBike.stepFind", "addBike.stepDetails", "addBike.stepParts"];
const STEP_BODY_KEYS = ["addBike.identityBody_step1", "addBike.identityBody_step2", "addBike.componentsBody"];

export function AddBikeDesktopPrototype(): ReactElement {
  const wizard = useAddBikeWizard();
  const { t } = useTranslation();
  const { active } = wizard;

  // Reset scroll position when changing wizard steps.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [active]);

  // After a save, the same way on as the phone: pair with Strava gear, or offer to connect Strava.
  if (wizard.offeringStrava) {
    // The phone screen as is, held to a phone-wide column so its rows don't stretch across the desktop.
    return (
      <Box maw={480} mx="auto">
        <StravaConnectScreen
          onConnect={wizard.connectStrava}
          onSkip={wizard.leaveAfterSave}
          connecting={wizard.connectingStrava}
        />
      </Box>
    );
  }
  if (wizard.savedBike) {
    return (
      <>
        <BikeAddedCard bikeName={wizard.savedBikeName} onContinue={wizard.leaveAfterSave} />
        <GearLinkingSheet
          opened={wizard.pairingGear}
          onClose={wizard.closeGearPairing}
          bikeIds={wizard.savedBikeId === null ? [] : [wizard.savedBikeId]}
        />
      </>
    );
  }

  return (
    <Stack gap="xl" px="md" pt="sm" pb="xl">
      <StepIndicator active={active} onStepClick={wizard.goToStep} />

      <Stack gap="lg">
        {/* Above both columns, so the step's card and "Tvoje kolo" start on one edge. */}
        <Box>
          <Text component="h2" fw={700} fz={22} c="text.6" lts="var(--tracking-title)" m={0}>
            {t(STEP_TITLE_KEYS[active])}
          </Text>
          <Text fz={14} c="var(--color-text-dim)" mt={6}>
            {t(STEP_BODY_KEYS[active])}
          </Text>
        </Box>

        <Box className="grid items-start gap-6 grid-cols-[minmax(0,1fr)_20rem]">
          <Box style={{ minWidth: 0 }}>
            {active === 0 && <BikeSearchDesktop wizard={wizard} />}
            {active === 1 && <BikeSpecDesktop wizard={wizard} />}
            {active === 2 && <BikePartsDesktop wizard={wizard} />}
          </Box>

          {/* Stretched to the row, so the panel inside has room to stay in view. */}
          <Box className="self-stretch">
            <BikeAsidePrototype wizard={wizard} />
          </Box>
        </Box>
      </Stack>

      <PhotoCropModal
        file={wizard.photoToCrop}
        fileUrl={wizard.photoToCropUrl}
        onCancel={wizard.cancelCrop}
        onConfirm={wizard.confirmCrop}
      />

      <BikeSummaryDesktop wizard={wizard} onConfirm={wizard.saveBike} />
    </Stack>
  );
}

// Numbered steps joined by a line; a finished one can be walked back to.
function StepIndicator({ active, onStepClick }: { active: number; onStepClick: (step: number) => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <Group component="ol" gap={12} wrap="nowrap" m={0} p={0} style={{ listStyle: "none" }}>
      {STEP_LABEL_KEYS.map((labelKey, index) => {
        const done = index < active;
        const current = index === active;
        const last = index === STEP_LABEL_KEYS.length - 1;
        const reached = done || current;

        return (
          <Group
            key={labelKey}
            component="li"
            aria-current={current ? "step" : undefined}
            gap={10}
            wrap="nowrap"
            style={{ flex: last ? "0 0 auto" : "1 1 0", minWidth: 0 }}
          >
            <UnstyledButton
              disabled={!done}
              onClick={() => onStepClick(index)}
              style={{ display: "flex", alignItems: "center", gap: 10, cursor: done ? "pointer" : "default" }}
            >
              <Box
                className="tabular-nums"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 26,
                  height: 26,
                  flexShrink: 0,
                  borderRadius: "50%",
                  fontSize: 12,
                  fontWeight: 700,
                  border: `1.5px solid ${reached ? "var(--mantine-color-primary-6)" : "var(--mantine-color-cards-4)"}`,
                  backgroundColor: done ? "var(--mantine-color-primary-6)" : "transparent",
                  color: done
                    ? "var(--mantine-color-textDark-6)"
                    : current
                      ? "var(--mantine-color-primary-6)"
                      : "var(--mantine-color-text-9)",
                }}
              >
                {done ? <Check size={14} strokeWidth={3} /> : index + 1}
              </Box>
              <Text fz={14} fw={600} c={reached ? "text.6" : "text.9"} style={{ whiteSpace: "nowrap" }}>
                {t(labelKey)}
              </Text>
            </UnstyledButton>
            {!last && (
              <Box
                h={2}
                style={{
                  flex: 1,
                  minWidth: 16,
                  borderRadius: 1,
                  backgroundColor: done ? "var(--mantine-color-primary-6)" : "var(--mantine-color-cards-4)",
                }}
              />
            )}
          </Group>
        );
      })}
    </Group>
  );
}

// The sidebar stays, so the confirmation is a card in the page rather than a full screen.
function BikeAddedCard({ bikeName, onContinue }: { bikeName: string; onContinue: () => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <Group justify="center" px="md" py={72}>
      <Paper radius="lg" px={32} pt={40} pb={32} w="100%" maw={460} style={cardSurface}>
        <Stack gap={10} align="center">
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: "color-mix(in srgb, var(--mantine-color-primary-6) 14%, transparent)",
              color: "var(--mantine-color-primary-6)",
            }}
          >
            <Check size={26} strokeWidth={2.5} />
          </Box>
          <Text component="h2" fw={700} fz={28} c="text.6" lts="var(--tracking-display)" m={0} mt={8}>
            {t("addBike.addedTitle")}
          </Text>
          <Text fz={16} fw={600} c="text.6" ta="center">
            {bikeName}
          </Text>
          <Text fz={14} c="var(--color-text-dim)" ta="center" mt={6}>
            {t("addBike.addedBody")}
          </Text>
          <Button
            fullWidth
            color="primary.6"
            c="textDark.6"
            radius="md"
            mt="md"
            rightSection={<ArrowRight size={16} />}
            style={{ height: "2.75rem" }}
            onClick={onContinue}
          >
            {t("addBike.addedContinue")}
          </Button>
        </Stack>
      </Paper>
    </Group>
  );
}
