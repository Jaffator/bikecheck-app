// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { type ReactElement } from "react";
import { Button, Group } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { disabledButtonStyles } from "./formStyles";

interface AddBikeFooterProps {
  // Picking a match is the only move that makes sense on the result list, so
  // the footer carries the confirm button alone there.
  isPickingMatch: boolean;
  canConfirm: boolean;
  onConfirm: () => void;
  onBack: () => void;
  // The last step has nothing to advance to, so it offers the save instead —
  // which opens the summary rather than writing straight away.
  showsNext: boolean;
  canAdvance: boolean;
  onNext: () => void;
  showsSave: boolean;
  onSave: () => void;
  // On step 1 this button bypasses the lookup rather than carrying its result
  // forward, so it says so instead of reading like the way through the wizard.
  skipsSearch: boolean;
}

export function AddBikeFooter({
  isPickingMatch,
  canConfirm,
  onConfirm,
  onBack,
  showsNext,
  canAdvance,
  onNext,
  showsSave,
  onSave,
  skipsSearch,
}: AddBikeFooterProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Group
      justify="space-between"
      gap="sm"
      // Marks the footer as covering the bottom of the page, so scrolling a
      // focused field into view can clear it instead of stopping underneath.
      data-fixed-footer
      style={{
        // Anchored to the viewport, not the page — the action stays reachable
        // however far down a long result list the user has scrolled.
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        padding: "1rem",
        paddingBottom: "calc(1rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))",
        backgroundColor: "var(--mantine-color-background-9)",
        borderTop: "1px solid var(--mantine-color-other-borderSubtle)",
        zIndex: 100,
      }}
    >
      {/* The header arrow already covers going back from the result list. */}
      {isPickingMatch ? (
        <Button
          leftSection={<Check size={18} />}
          onClick={onConfirm}
          disabled={!canConfirm}
          radius="sm"
          styles={disabledButtonStyles}
          style={{ flex: 1, height: "3rem" }}
        >
          {t("addBike.confirmSelection")}
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            color="secondary.6"
            leftSection={<ChevronLeft size={14} />}
            onClick={onBack}
            style={{ flex: 1, height: "3rem" }}
          >
            {t("action.back")}
          </Button>
          {showsNext && (
            <Button
              // Skipping is the lesser path on step 1 — "Find specification"
              // inside the form is the one that should draw the eye.
              variant={skipsSearch ? "outline" : "filled"}
              color={skipsSearch ? "secondary.6" : "primary.6"}
              rightSection={<ChevronRight size={14} />}
              disabled={!canAdvance}
              styles={disabledButtonStyles}
              style={{ flex: 1, height: "3rem" }}
              onClick={onNext}
            >
              {skipsSearch ? t("addBike.skipSearch") : t("addBike.nextStep")}
            </Button>
          )}
          {showsSave && (
            <Button
              leftSection={<Check size={18} />}
              onClick={onSave}
              radius="sm"
              styles={disabledButtonStyles}
              style={{ flex: 1, height: "3rem" }}
            >
              {t("addBike.saveBike")}
            </Button>
          )}
        </>
      )}
    </Group>
  );
}
