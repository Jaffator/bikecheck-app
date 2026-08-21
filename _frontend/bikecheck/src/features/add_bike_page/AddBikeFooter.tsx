// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { type ReactElement } from "react";
import { Button, Group } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { disabledButtonStyles } from "./formStyles";

interface AddBikeFooterProps {
  // Show only confirmation while choosing a search result.
  isPickingMatch: boolean;
  canConfirm: boolean;
  onConfirm: () => void;
  onBack: () => void;
  // Replace next with save on the final step.
  showsNext: boolean;
  canAdvance: boolean;
  onNext: () => void;
  showsSave: boolean;
  onSave: () => void;
  // Distinguish the optional lookup skip action.
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
      // Exposes the fixed footer to focus-scrolling hooks.
      data-fixed-footer
      style={{
        // Keep actions reachable while the page scrolls.
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
              // Keep the lookup skip action secondary.
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
