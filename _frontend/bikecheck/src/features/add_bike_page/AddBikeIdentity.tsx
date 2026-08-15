// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useEffect, useRef, type ReactElement } from "react";
import { Stack, Stepper, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useHeaderStore } from "@/store/store";
import { BikeSearchFallback } from "./BikeSearchFallback";
import { BikeSearchResults } from "./BikeSearchResults";
import { BikeSpecification } from "./BikeSpecification";
import { BikeComponentList } from "./BikeComponentList";
import { BikeIdentityForm } from "./BikeIdentityForm";
import { AddBikeFooter } from "./AddBikeFooter";
import { TOTAL_STEPS, useAddBikeWizard } from "./useAddBikeWizard";

// The "Add new bike" wizard: identity, specification, components. Each step is
// its own component; this one owns the frame around them.
export function AddBikeIdentity(): ReactElement {
  const wizard = useAddBikeWizard();
  const { t } = useTranslation();
  const setHeaderTitleKey = useHeaderStore((state) => state.setTitleKey);
  const setHeaderOnBack = useHeaderStore((state) => state.setOnBack);

  const { active, searchReplacedForm, showsFallback, searchResults } = wizard;

  // Both overrides are cleared on unmount so the header falls back to the
  // route title and the router's own back.
  useEffect(() => {
    setHeaderTitleKey(searchReplacedForm ? "addBike.selectModelTitle" : null);
    return () => setHeaderTitleKey(null);
  }, [searchReplacedForm, setHeaderTitleKey]);

  // Steps past the first have their own previous step, so the arrow walks the
  // wizard back rather than leaving the page.
  const headerGoesBackInPage = searchReplacedForm || active > 0;

  // prevStep is recreated every render; the ref keeps the registered handler
  // pointed at the current one without re-registering on each render.
  const prevStepRef = useRef(wizard.prevStep);

  useEffect(() => {
    prevStepRef.current = wizard.prevStep;
  });

  useEffect(() => {
    if (!headerGoesBackInPage) {
      setHeaderOnBack(null);
      return;
    }
    setHeaderOnBack(() => prevStepRef.current());
    return () => setHeaderOnBack(null);
  }, [headerGoesBackInPage, setHeaderOnBack]);

  return (
    // Clears the fixed footer: its own 1rem + 3rem button + 1rem, plus the
    // safe-area inset it also pads by, plus a gap so the last item is not flush.
    <Stack gap="lg" px="md" pt="md" pb="calc(6rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
      {/* ----------- Progress indicator ----------- */}
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
            // The variables above colour the circle; the number inherits its
            // colour from the icon element itself.
            stepIcon: {
              color: "var(--mantine-color-text-9)",
            },
          }}
        >
          <Stepper.Step aria-label={t("addBike.stepIdentity")} withIcon>
            {/* ----------- Header ----------- */}
            {/* Once the search replaced the form, the page header carries the
                title instead, so repeating it here would duplicate it. */}
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

      {/* ----------- Step 1: identity ----------- */}
      {/* Hidden once the search produced something to react to. */}
      {active === 0 && !showsFallback && searchResults === null && (
        <BikeIdentityForm
          form={wizard.form}
          brandNames={wizard.brandNames}
          brandModels={wizard.brandModels}
          canSearch={wizard.canSearch}
          isSearching={wizard.isSearching}
          onSubmit={wizard.submitSearch}
        />
      )}

      {/* ----------- Result picker ----------- */}
      {/* Replaces the form: the user is done searching and now picks a match. */}
      {active === 0 && searchResults !== null && (
        <BikeSearchResults results={searchResults} selectedBikeUrl={wizard.selectedBikeUrl} onSelect={wizard.selectBike} />
      )}

      {/* ----------- Lookup fallback ----------- */}
      {/* Kept below the form so the user can correct brand/model/year and retry. */}
      {active === 0 && showsFallback && (
        <BikeSearchFallback
          variant={wizard.searchFailed ? "failed" : "empty"}
          diagnosticCode={wizard.searchFailed ? wizard.diagnosticCode : undefined}
          onRetry={wizard.retrySearch}
          onEnterManually={wizard.enterManually}
          onSkip={wizard.skipStep}
        />
      )}

      {/* ----------- Step 2: specification ----------- */}
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

      {/* ----------- Step 3: scraped components ----------- */}
      {active === 2 && (
        <BikeComponentList
          groups={wizard.componentGroups}
          components={wizard.defaultComponents}
          entries={wizard.componentEntries}
          onChangeDescription={wizard.changeComponentDescription}
          splitComponents={wizard.splitComponents}
          onToggleSplit={wizard.toggleComponentSplit}
          openGroupId={wizard.openGroupId}
          onToggleGroup={wizard.toggleGroup}
          isLoading={wizard.componentsLoading}
          isError={wizard.componentsError}
        />
      )}

      {/* ----------- Step footer ----------- */}
      <AddBikeFooter
        isPickingMatch={active === 0 && searchResults !== null}
        canConfirm={wizard.selectedBikeUrl !== null}
        onConfirm={wizard.confirmSelection}
        onBack={wizard.prevStep}
        showsNext={active < TOTAL_STEPS - 1}
        canAdvance={wizard.canAdvance}
        onNext={wizard.nextStep}
      />
    </Stack>
  );
}
