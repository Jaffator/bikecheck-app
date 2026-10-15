// PROTOTYPE (proto/desktop-wizards): the search and a collection load in a modal over the page they belong to.
import { type ReactElement, type ReactNode } from "react";
import { Button, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ChevronLeft, RefreshCw, Search, SquarePen, type LucideIcon } from "lucide-react";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { LookupOutcome } from "../BikeSearchFallback";
import { LookupProgressContent } from "../LookupProgress";
import type { AddBikeWizard } from "../useAddBikeWizard";

const BUTTON_HEIGHT = "2.75rem";

// Open from the search going out until its results are on the page, or it is given up on.
export function SearchLookupModal({ wizard }: { wizard: AddBikeWizard }): ReactElement {
  const { t } = useTranslation();
  const running = wizard.searchPhase !== "idle";
  const failed = wizard.searchFailed;

  return (
    <LookupModal opened={running || wizard.showsFallback} running={running} onClose={wizard.cancelSearch}>
      {running ? (
        <Stack gap="lg">
          <LookupProgressContent kind="search" name={wizard.searchedName} phase={wizard.searchPhase} />
          <ModalButton label={t("addBike.cancelLookup")} onClick={wizard.cancelSearch} />
        </Stack>
      ) : (
        <LookupOutcome variant={failed ? "failed" : "empty"} diagnosticCode={failed ? wizard.diagnosticCode : undefined}>
          <Stack gap="sm" w="100%">
            {failed ? (
              <ModalButton primary icon={RefreshCw} label={t("addBike.retrySearch")} onClick={wizard.resendSearch} />
            ) : (
              <ModalButton primary icon={Search} label={t("addBike.editSearch")} onClick={wizard.cancelSearch} />
            )}
            <ModalButton icon={SquarePen} label={t("addBike.enterManually")} onClick={wizard.enterManually} />
          </Stack>
        </LookupOutcome>
      )}
    </LookupModal>
  );
}

// Open until the collection's own list takes over the grid; backing out returns to the list behind it.
export function CollectionLookupModal({ wizard }: { wizard: AddBikeWizard }): ReactElement {
  const { t } = useTranslation();
  const { openCollection } = wizard;
  const running = wizard.collectionPhase !== "idle";
  const failed = wizard.collectionFailed;

  return (
    <LookupModal opened={wizard.pickedFrom !== null} running={running} onClose={wizard.leaveCollection}>
      {running ? (
        <Stack gap="lg">
          <LookupProgressContent
            key={openCollection?.bikeUrl}
            kind="collection"
            name={openCollection?.name}
            phase={wizard.collectionPhase}
          />
          <ModalButton label={t("addBike.cancelLookup")} onClick={wizard.leaveCollection} />
        </Stack>
      ) : (
        <LookupOutcome
          variant={failed ? "failed" : "empty"}
          body={failed ? t("addBike.collectionFailed", { code: wizard.diagnosticCode }) : t("addBike.collectionEmpty")}
        >
          <Stack gap="sm" w="100%">
            {failed && (
              <ModalButton primary icon={RefreshCw} label={t("addBike.retrySearch")} onClick={wizard.retryCollection} />
            )}
            <ModalButton icon={ChevronLeft} label={t("addBike.backToResults")} onClick={wizard.leaveCollection} />
          </Stack>
        </LookupOutcome>
      )}
    </LookupModal>
  );
}

interface LookupModalProps {
  opened: boolean;
  // ✕ and Esc; on a running lookup this cancels it.
  onClose: () => void;
  running: boolean;
  children: ReactNode;
}

// The wrapper keeps the last content while it fades, so a finished bar leaves at 100 %.
function LookupModal({ opened, onClose, running, children }: LookupModalProps): ReactElement {
  return (
    <ResponsiveSheet
      opened={opened}
      onClose={onClose}
      desktop="modal"
      closeOnClickOutside={!running}
      styles={{
        // No title, so the ✕ sits in the corner instead of above an empty heading row.
        header: { minHeight: 0, paddingBottom: 0 },
        // A second click while it fades would leave a nested collection twice.
        content: opened ? {} : { pointerEvents: "none" },
      }}
    >
      {children}
    </ResponsiveSheet>
  );
}

interface ModalButtonProps {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  // Filled for the main way on; the rest stay quiet outlines.
  primary?: boolean;
}

function ModalButton({ label, onClick, icon: Icon, primary = false }: ModalButtonProps): ReactElement {
  return (
    <Button
      fullWidth
      radius="md"
      variant={primary ? "filled" : "outline"}
      color={primary ? "primary.6" : undefined}
      c={primary ? "textDark.6" : undefined}
      leftSection={Icon && <Icon size={16} color={primary ? undefined : "var(--mantine-color-primary-5)"} />}
      onClick={onClick}
      style={{ height: BUTTON_HEIGHT }}
    >
      {label}
    </Button>
  );
}
