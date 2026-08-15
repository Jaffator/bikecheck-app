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
  // The last step has nothing to advance to yet — saving the bike lands with
  // the create call.
  showsNext: boolean;
  canAdvance: boolean;
  onNext: () => void;
}

export function AddBikeFooter({
  isPickingMatch,
  canConfirm,
  onConfirm,
  onBack,
  showsNext,
  canAdvance,
  onNext,
}: AddBikeFooterProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Group
      justify="space-between"
      gap="sm"
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
              color="primary.6"
              rightSection={<ChevronRight size={14} />}
              disabled={!canAdvance}
              styles={disabledButtonStyles}
              style={{ flex: 1, height: "3rem" }}
              onClick={onNext}
            >
              {t("addBike.nextStep")}
            </Button>
          )}
        </>
      )}
    </Group>
  );
}
