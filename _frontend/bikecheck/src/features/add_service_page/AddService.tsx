// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useEffect, useRef, useState, type ReactElement } from "react";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { tapFeedback } from "@/utils/haptics";
import { useHeaderStore } from "@/store/store";
import { ServiceBikeStep } from "./ServiceBikeStep";
import { ServiceCategoryStep } from "./ServiceCategoryStep";
import { ServiceActionsStep } from "./ServiceActionsStep";
import { ServiceSummaryStep } from "./ServiceSummaryStep";
import { useAddServiceWizard, type BackPrompt, type WizardStep } from "./useAddServiceWizard";

// Each loss the user can be warned about names itself; nothing is assembled from the
// prompt at the call site, so every key stays greppable.
const DISCARD_COPY: Record<Exclude<BackPrompt, null>, { title: string; body: string }> = {
  discardAction: { title: "addService.discardActionTitle", body: "addService.discardActionBody" },
  discardEdits: { title: "addService.discardEditsTitle", body: "addService.discardEditsBody" },
  discardService: { title: "addService.discardServiceTitle", body: "addService.discardServiceBody" },
};

// Each step says what it is asking for, so the header is never just "Add service".
const TITLE_KEY_BY_STEP: Record<WizardStep, string> = {
  bike: "addService.stepBike",
  category: "addService.stepCategory",
  actions: "addService.stepActions",
  summary: "addService.stepSummary",
};

// The frame around the four steps that record one Service.
export function AddService(): ReactElement {
  const wizard = useAddServiceWizard();
  const setHeaderTitleKey = useHeaderStore((state) => state.setTitleKey);
  const setHeaderOnBack = useHeaderStore((state) => state.setOnBack);
  const setBackHidden = useHeaderStore((state) => state.setBackHidden);
  // What the user is being asked to confirm before back throws work away.
  const [prompt, setPrompt] = useState<BackPrompt>(null);

  // Restore the route header title when this view unmounts.
  useEffect(() => {
    setHeaderTitleKey(TITLE_KEY_BY_STEP[wizard.step]);
    return () => setHeaderTitleKey(null);
  }, [wizard.step, setHeaderTitleKey]);

  // The Summary has no way back into the wizard, so it shows no arrow — see ADR 0006.
  useEffect(() => {
    setBackHidden(wizard.step === "summary");
    return () => setBackHidden(false);
  }, [wizard.step, setBackHidden]);

  // Keep the registered handler current without repeated registration.
  const backRef = useRef<() => void>(() => {});
  useEffect(() => {
    backRef.current = (): void => {
      const pending = wizard.backPrompt();
      if (pending === null) {
        wizard.back();
        return;
      }
      setPrompt(pending);
    };
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
          draft={wizard.draft}
          canCommit={wizard.canCommit}
          onToggleAction={wizard.toggleAction}
          onUpdateAction={wizard.updateAction}
          onCommit={wizard.commitDraft}
        />
      )}

      {wizard.step === "summary" && (
        <ServiceSummaryStep
          blocks={wizard.blocks}
          onEditBlock={wizard.editBlock}
          onAnotherCategory={wizard.addAnotherCategory}
          serviceDate={wizard.serviceDate}
          onServiceDateChange={wizard.setServiceDate}
          note={wizard.note}
          onNoteChange={wizard.setNote}
          totalCost={wizard.totalCost}
          onTotalCostChange={wizard.setTotalCost}
          attachments={wizard.attachments}
          onAttachmentAdded={wizard.addAttachment}
          onAttachmentRemoved={wizard.removeAttachment}
          canSave={wizard.canSave}
          onSave={wizard.save}
          saving={wizard.saving}
          saveFailed={wizard.saveFailed}
        />
      )}

      <DiscardModal
        prompt={prompt}
        onKeep={() => setPrompt(null)}
        onDiscard={() => {
          setPrompt(null);
          wizard.back();
        }}
      />
    </Stack>
  );
}

// Leaving costs the user something, so leaving is asked about rather than assumed.
function DiscardModal({
  prompt,
  onKeep,
  onDiscard,
}: {
  prompt: BackPrompt;
  onKeep: () => void;
  onDiscard: () => void;
}): ReactElement {
  const { t } = useTranslation();
  const copy = prompt === null ? null : DISCARD_COPY[prompt];

  return (
    <Modal
      opened={prompt !== null}
      onClose={onKeep}
      title={copy === null ? "" : t(copy.title)}
      centered
      radius="md"
      styles={{
        content: { backgroundColor: "var(--mantine-color-cards-6)" },
        header: { backgroundColor: "var(--mantine-color-cards-6)" },
        title: { fontWeight: 600, color: "var(--mantine-color-text-6)" },
      }}
    >
      <Stack gap="lg">
        <Text size="sm" c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
          {copy === null ? "" : t(copy.body)}
        </Text>

        <Group gap="sm" grow>
          <Button variant="default" radius="md" onClick={onKeep}>
            {t("addService.keep")}
          </Button>
          <Button
            color="red.5"
            radius="md"
            onClick={() => {
              void tapFeedback();
              onDiscard();
            }}
          >
            {t("addService.discard")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
