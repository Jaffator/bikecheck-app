// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useEffect, useRef, type ReactElement } from "react";
import { Button, Loader, Stack, Stepper, Text } from "@mantine/core";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useHeaderStore } from "@/store/store";
import { BikeSearchFallback } from "./BikeSearchFallback";
import { BikeSearchResults } from "./BikeSearchResults";
import { BikeSpecification } from "./BikeSpecification";
import { BikeComponentList } from "./BikeComponentList";
import { BikeIdentityForm } from "./BikeIdentityForm";
import { AddBikeFooter } from "./AddBikeFooter";
import { AddBikeSummaryModal } from "./AddBikeSummaryModal";
import { PhotoCropModal } from "./PhotoCropModal";
import { BikeAddedScreen } from "./BikeAddedScreen";
import { GearLinkingSheet } from "../strava/GearLinkingSheet";
import { StravaConnectScreen } from "./StravaConnectScreen";
import { TOTAL_STEPS, useAddBikeWizard } from "./useAddBikeWizard";

// Render the add-bike wizard frame around its step components.
export function AddBikeIdentity(): ReactElement {
  const wizard = useAddBikeWizard();
  const { t } = useTranslation();
  const setHeaderTitleKey = useHeaderStore((state) => state.setTitleKey);
  const setHeaderOnBack = useHeaderStore((state) => state.setOnBack);
  const setChromeHidden = useHeaderStore((state) => state.setChromeHidden);

  const { active, searchReplacedForm, showsFallback, searchResults, savedBike, offeringStrava } = wizard;

  // Both post-save screens take the whole viewport and own their own way on.
  const wizardIsOver = savedBike || offeringStrava;

  // Restore the route header title when this view unmounts.
  useEffect(() => {
    setHeaderTitleKey(searchReplacedForm ? "addBike.selectModelTitle" : null);
    return () => setHeaderTitleKey(null);
  }, [searchReplacedForm, setHeaderTitleKey]);

  // Hide app chrome while post-save screens own the viewport.
  useEffect(() => {
    setChromeHidden(wizardIsOver);
    return () => setChromeHidden(false);
  }, [wizardIsOver, setChromeHidden]);

  // Reset scroll position when changing wizard steps.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [active]);

  // Use wizard back navigation after the first step.
  const headerGoesBackInPage = searchReplacedForm || active > 0;

  // Keep registered header handlers current without repeated registration.
  const prevStepRef = useRef(wizard.prevStep);
  const leaveAfterSaveRef = useRef(wizard.leaveAfterSave);

  useEffect(() => {
    prevStepRef.current = wizard.prevStep;
    leaveAfterSaveRef.current = wizard.leaveAfterSave;
  });

  useEffect(() => {
    // Prevent back navigation into the completed wizard.
    if (wizardIsOver) {
      setHeaderOnBack(() => leaveAfterSaveRef.current());
      return () => setHeaderOnBack(null);
    }
    if (!headerGoesBackInPage) {
      setHeaderOnBack(null);
      return;
    }
    setHeaderOnBack(() => prevStepRef.current());
    return () => setHeaderOnBack(null);
  }, [wizardIsOver, headerGoesBackInPage, setHeaderOnBack]);

  // Post-save screens replace the completed wizard.
  if (offeringStrava) {
    return (
      <StravaConnectScreen
        onConnect={wizard.connectStrava}
        onSkip={wizard.leaveAfterSave}
        connecting={wizard.connectingStrava}
      />
    );
  }
  if (savedBike) {
    return (
      <>
        <BikeAddedScreen bikeName={wizard.savedBikeName} onContinue={wizard.leaveAfterSave} />
        {/* Pair only the bike saved by this wizard. */}
        <GearLinkingSheet
          opened={wizard.pairingGear}
          onClose={wizard.closeGearPairing}
          bikeIds={wizard.savedBikeId === null ? [] : [wizard.savedBikeId]}
        />
      </>
    );
  }

  return (
    // Reserve space for the fixed footer and safe area.
    <Stack gap="lg" px="md" pt="md" pb="calc(6rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
      <Stack gap="xs">
        <Stepper
          active={active}
          onStepClick={wizard.goToStep}
          size="xs"
          iconSize={26}
          completedIcon={null}
          styles={{
            root: {
              "--stepper-outline-color": "var(--mantine-color-cards-6)",
              "--stepper-color": "var(--mantine-color-primary-6)",
              "--stepper-icon-color": "var(--mantine-color-text-6)",
            } as React.CSSProperties,
            // Keep the step number color independent from its circle.
            stepIcon: {
              color: "var(--mantine-color-text-9)",
            },
          }}
        >
          <Stepper.Step aria-label={t("addBike.stepIdentity")} withIcon>
            {/* Avoid duplicating the search-result page title. */}
            {!searchReplacedForm && (
              <Stack gap="xs">
                <Text fw={700} size="xl" c="text.6">
                  {t("addBike.identityTitle_step1")}
                </Text>
                <Text size="md" c="text.7">
                  {t("addBike.identityBody_step1")}
                </Text>
              </Stack>
            )}
          </Stepper.Step>
          <Stepper.Step aria-label={t("addBike.stepSpecification")} withIcon>
            <Stack gap="xs">
              <Text fw={700} size="xl" c="text.6">
                {t("addBike.identityTitle_step2")}
              </Text>
              <Text size="md" c="text.7">
                {t("addBike.identityBody_step2")}
              </Text>
            </Stack>
          </Stepper.Step>
          <Stepper.Step aria-label={t("addBike.stepPhotos")} withIcon>
            <Stack gap="xs">
              <Text fw={700} size="xl" c="text.6">
                {t("addBike.identityTitle_step3")}
              </Text>
              <Text size="md" c="text.7">
                {t("addBike.componentsBody")}
              </Text>
            </Stack>
          </Stepper.Step>
        </Stepper>
      </Stack>

      {/* Hide identity fields after receiving lookup results. */}
      {active === 0 && !searchReplacedForm && (
        <BikeIdentityForm
          form={wizard.form}
          brandNames={wizard.brandNames}
          brandModels={wizard.brandModels}
          canSearch={wizard.canSearch}
          isSearching={wizard.isSearching}
          onSubmit={wizard.submitSearch}
        />
      )}

      {/* Replace identity fields with selectable results. */}
      {active === 0 && searchResults !== null && (
        <BikeSearchResults
          results={searchResults}
          selectedBikeUrl={wizard.selectedBikeUrl}
          onSelect={wizard.selectBike}
          openCollection={wizard.openCollection}
          onOpenCollection={wizard.enterCollection}
          onLeaveCollection={wizard.leaveCollection}
        />
      )}

      {/* A collection with nothing to show keeps the results it was picked from. */}
      {active === 0 && wizard.openCollection !== null && searchResults === null && (
        <Stack gap="md">
          <Button
            variant="subtle"
            color="secondary.6"
            leftSection={<ChevronLeft size={18} />}
            onClick={wizard.leaveCollection}
            radius="sm"
            style={{ alignSelf: "flex-start", paddingLeft: 0 }}
          >
            {t("addBike.backToResults")}
          </Button>

          {/* Name the collection here too — it is the only thing on screen. */}
          <Text fw={700} size="lg" c="text.6">
            {wizard.openCollection.name}
          </Text>

          {wizard.collectionLoading ? (
            <Loader size="sm" color="primary.6" />
          ) : (
            <Text size="sm" c="text.7">
              {wizard.collectionFailed
                ? t("addBike.collectionFailed", { code: wizard.diagnosticCode })
                : t("addBike.collectionEmpty")}
            </Text>
          )}
        </Stack>
      )}

      {/* Keep form context available when lookup needs retrying. */}
      {active === 0 && showsFallback && (
        <BikeSearchFallback
          variant={wizard.searchFailed ? "failed" : "empty"}
          diagnosticCode={wizard.searchFailed ? wizard.diagnosticCode : undefined}
          onRetry={wizard.retrySearch}
          onEnterManually={wizard.enterManually}
          onSkip={wizard.skipStep}
        />
      )}

      {active === 1 && (
        <BikeSpecification
          bike={wizard.confirmedBike}
          fallbackName={`${wizard.form.values.brand} ${wizard.form.values.model}`.trim()}
          year={wizard.form.values.year}
          categories={wizard.categories}
          values={wizard.specification}
          onChange={wizard.changeSpecification}
          photoUrl={wizard.photoUrl}
          onPickPhoto={wizard.pickPhoto}
        />
      )}

      {active === 2 && (
        <BikeComponentList
          groups={wizard.componentGroups}
          components={wizard.defaultComponents}
          entries={wizard.componentEntries}
          onChangeDescription={wizard.changeComponentDescription}
          splitComponents={wizard.splitComponents}
          onToggleSplit={wizard.toggleComponentSplit}
          disabledComponents={wizard.disabledComponents}
          onToggleDisabled={wizard.toggleComponentDisabled}
          openGroupId={wizard.openGroupId}
          onToggleGroup={wizard.toggleGroup}
          isLoading={wizard.componentsLoading}
          isError={wizard.componentsError}
        />
      )}

      <AddBikeFooter
        isPickingMatch={active === 0 && searchResults !== null}
        canConfirm={wizard.selectedBikeUrl !== null}
        onConfirm={wizard.confirmSelection}
        onBack={wizard.prevStep}
        showsNext={active < TOTAL_STEPS - 1}
        canAdvance={wizard.canAdvance}
        onNext={wizard.nextStep}
        showsSave={active === TOTAL_STEPS - 1}
        onSave={wizard.openSummary}
        skipsSearch={active === 0}
      />

      {/* Keep photo cropping state across step renders. */}
      <PhotoCropModal
        file={wizard.photoToCrop}
        fileUrl={wizard.photoToCropUrl}
        onCancel={wizard.cancelCrop}
        onConfirm={wizard.confirmCrop}
      />

      <AddBikeSummaryModal
        opened={wizard.summaryOpen}
        onClose={wizard.closeSummary}
        identity={wizard.form.values}
        specification={wizard.specification}
        components={wizard.componentsToSave}
        onConfirm={wizard.saveBike}
        isSaving={wizard.isSaving}
        isError={wizard.saveFailed}
        errorDetails={wizard.saveErrorDetails}
      />
    </Stack>
  );
}
