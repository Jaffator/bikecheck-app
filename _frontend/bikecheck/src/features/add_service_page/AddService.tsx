// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useEffect, useRef, type ReactElement } from "react";
import { Stack } from "@mantine/core";
import { useHeaderStore } from "@/store/store";
import { ServiceBikeStep } from "./ServiceBikeStep";
import { ServiceCategoryStep } from "./ServiceCategoryStep";
import { ServiceActionsStep } from "./ServiceActionsStep";
import { ServiceReviewStep } from "./ServiceReviewStep";
import { useAddServiceWizard, type WizardStep } from "./useAddServiceWizard";

// Each step says what it is asking for, so the header is never just "Add service".
const TITLE_KEY_BY_STEP: Record<WizardStep, string> = {
  bike: "addService.stepBike",
  category: "addService.stepCategory",
  actions: "addService.stepActions",
  review: "addService.stepReview",
};

// The frame around the four steps that record one Service.
export function AddService(): ReactElement {
  const wizard = useAddServiceWizard();
  const setHeaderTitleKey = useHeaderStore((state) => state.setTitleKey);
  const setHeaderOnBack = useHeaderStore((state) => state.setOnBack);

  // Restore the route header title when this view unmounts.
  useEffect(() => {
    setHeaderTitleKey(TITLE_KEY_BY_STEP[wizard.step]);
    return () => setHeaderTitleKey(null);
  }, [wizard.step, setHeaderTitleKey]);

  // Keep the registered handler current without repeated registration.
  const backRef = useRef(wizard.back);
  useEffect(() => {
    backRef.current = wizard.back;
  });

  // Back walks the wizard rather than the browser history, for the header arrow and the
  // Android hardware button alike.
  useEffect(() => {
    setHeaderOnBack(() => backRef.current());
    return () => setHeaderOnBack(null);
  }, [setHeaderOnBack]);

  // Reset scroll position when changing wizard steps.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [wizard.step]);

  return (
    <Stack gap="lg" px="md" pt="md" pb="calc(2rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
      {wizard.step === "bike" && (
        <ServiceBikeStep bikes={wizard.bikes} isLoading={wizard.bikesLoading} onChoose={wizard.chooseBike} />
      )}

      {wizard.step === "category" && <ServiceCategoryStep bikeId={wizard.bikeId} onChoose={wizard.chooseCategory} />}

      {wizard.step === "actions" && (
        <ServiceActionsStep
          bikeId={wizard.bikeId}
          block={wizard.activeBlock}
          blockIndex={wizard.activeBlockIndex}
          blockCount={wizard.blocks.length}
          serviceDate={wizard.serviceDate}
          onServiceDateChange={wizard.setServiceDate}
          onToggleAction={wizard.toggleAction}
          onUpdateAction={wizard.updateAction}
          onAnotherCategory={wizard.addAnotherCategory}
          onNext={wizard.goToReview}
        />
      )}

      {wizard.step === "review" && (
        <ServiceReviewStep
          blocks={wizard.blocks}
          onEditBlock={wizard.editBlock}
          note={wizard.note}
          onNoteChange={wizard.setNote}
          totalCost={wizard.totalCost}
          onTotalCostChange={wizard.setTotalCost}
          attachments={wizard.attachments}
          onAttachmentAdded={wizard.addAttachment}
          onAttachmentRemoved={wizard.removeAttachment}
          onSave={wizard.save}
          saving={wizard.saving}
          saveFailed={wizard.saveFailed}
        />
      )}
    </Stack>
  );
}
