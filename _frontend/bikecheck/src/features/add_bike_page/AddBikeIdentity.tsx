// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useEffect, useRef, useState, type ReactElement } from "react";
import { Button, Group, Paper, Select, Stack, Stepper, Text, Autocomplete } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Tag, Calendar, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import { useHeaderStore } from "@/store/store";
import { useBikeFormOptions, useSearchBikeExternal, useExternalBikeComponents } from "../bikes/bikes.queries";
import { ApiError } from "@/api/client";
import type { BikeSearchResult } from "../bikes/bikes.types";
import { BikeSearchFallback } from "./BikeSearchFallback";
import { BikeSearchResults } from "./BikeSearchResults";
import { BikeSpecification, type BikeSpecificationValues } from "./BikeSpecification";
import { BikeComponentList } from "./BikeComponentList";
import { inputStyles, dropdownProps } from "./formStyles";

const TOTAL_STEPS = 3;

// Descending so the most likely picks (recent bikes) sit at the top of the list.
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 20 }, (_, i) => String(CURRENT_YEAR + 1 - i));

// Step 1 of the "Add new bike" wizard — brand/model/year used to look up the
// bike's default specification. The lookup itself lands with the next step.
export function AddBikeIdentity(): ReactElement {
  const { data: bikeFormOptions } = useBikeFormOptions();
  const searchBike = useSearchBikeExternal();
  const [active, setActive] = useState(0);
  const [selectedBikeUrl, setSelectedBikeUrl] = useState<string | null>(null);
  // Held separately from the search result: going back to step 1 resets the
  // search, and the confirmed pick has to survive that.
  const [confirmedBike, setConfirmedBike] = useState<BikeSearchResult | null>(null);
  const [specification, setSpecification] = useState<BikeSpecificationValues>({
    category: null,
    suspension: null,
    frameSize: null,
    sizeLength: "",
    wheelSize: null,
    ebike: false,
  });
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setHeaderTitleKey = useHeaderStore((state) => state.setTitleKey);
  const setHeaderOnBack = useHeaderStore((state) => state.setOnBack);
  const brandNames = bikeFormOptions?.bikeBrands.map((brand) => brand.bike_brand) ?? [];
  const form = useForm({
    initialValues: {
      brand: "",
      model: "",
      year: null as string | null,
    },
  });

  function nextStep(): void {
    tapFeedback();
    setActive((current) => (current < TOTAL_STEPS - 1 ? current + 1 : current));
  }

  // The stepper only walks back over ground already covered — jumping ahead
  // would skip the choices those steps depend on.
  function goToStep(step: number): void {
    if (step > active) return;
    tapFeedback();
    setActive(step);
  }

  // On the first step there is no previous step, so back leaves the wizard —
  // unless the search already replaced the form, in which case back means
  // "return to the search form".
  function prevStep(): void {
    tapFeedback();

    if (active === 0) {
      // The search replaced the form, so back returns to it first.
      if (searchBike.isSuccess || searchBike.isError) {
        setSelectedBikeUrl(null);
        searchBike.reset();
        return;
      }
      navigate(-1);
      return;
    }
    setActive((current) => current - 1);
  }

  // The scraper takes a single search string, so brand and model are joined.
  function handleSubmit(values: typeof form.values): void {
    tapFeedback();
    searchBike.mutate(
      {
        bikeName: `${values.brand} ${values.model}`.trim(),
        year: values.year ?? "",
      },
      {
        onSuccess: (results) => console.log("searchBikeExternal", results),
        onError: (error) => console.error("searchBikeExternal failed", error),
      },
    );
  }

  // Only clears the failed result so the form comes back — the user decides
  // when to search again, after correcting brand/model/year.
  function retrySearch(): void {
    searchBike.reset();
  }

  // Locks in the pick from step 1 and moves on to specifying it.
  function confirmSelection(): void {
    const picked = searchBike.data?.find((result) => result.bikeUrl === selectedBikeUrl);
    if (!picked) return;

    setConfirmedBike(picked);
    nextStep();
  }

  // Manual entry and skipping both move on without a specification; the
  // difference is whether the user fills it in on the next step or not.
  function enterManually(): void {
    searchBike.reset();
    nextStep();
  }

  function skipStep(): void {
    searchBike.reset();
    nextStep();
  }

  const brandModels =
    bikeFormOptions?.bikeModels
      .filter((model) => model.brand_id === bikeFormOptions.bikeBrands.find((b) => b.bike_brand === form.values.brand)?.id)
      .map((model) => model.model_name) ?? [];

  // Without a brand and model the scraper would return an unfiltered list.
  const canSearch = form.values.brand.trim().length > 0 && form.values.model.trim().length > 0;

  // The provider answering with an empty list is a success, not an error, so
  // the two outcomes have to be told apart explicitly.
  const searchFailed = searchBike.isError;
  const searchEmpty = searchBike.isSuccess && searchBike.data.length === 0;
  const searchResults = searchBike.isSuccess && searchBike.data.length > 0 ? searchBike.data : null;

  // The backend only reports an HTTP status, so that is what the user can quote
  // back to support — 502 from the scraper, 504 when the provider timed out.
  const diagnosticCode =
    searchBike.error instanceof ApiError ? `ERR_LOOKUP_${searchBike.error.status}` : "ERR_LOOKUP_UNKNOWN";

  const showsFallback = searchFailed || searchEmpty;
  // Once the search replaced the form, the step is no longer "add a bike" but
  // "pick the match" — and the header arrow has somewhere to go inside the
  // page: back to the form, not out of the wizard.
  const searchReplacedForm = active === 0 && (showsFallback || searchResults !== null);

  // Scraping the detail page is slow, so it starts as soon as the pick is
  // confirmed rather than when step 3 finally renders.
  const componentsQuery = useExternalBikeComponents(confirmedBike?.bikeUrl ?? null);

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
  const prevStepRef = useRef(prevStep);

  useEffect(() => {
    prevStepRef.current = prevStep;
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
          onStepClick={goToStep}
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

      {/* ----------- Form card ----------- */}
      {/* Hidden once the search produced something to react to. */}
      {active === 0 && !showsFallback && searchResults === null && (
        <Paper bg="cards.6" p="md" radius="md">
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <Stack gap={4}>
                <Text size="xs" fw={600} c="text.7" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                  {t("addBike.brand")}
                </Text>
                <Autocomplete
                  placeholder={t("addBike.brandPlaceholder")}
                  data={brandNames}
                  limit={8}
                  leftSection={<Tag size={18} />}
                  value={form.values.brand}
                  onChange={(value) => form.setFieldValue("brand", value)}
                  radius="sm"
                  styles={inputStyles}
                  comboboxProps={dropdownProps}
                />
              </Stack>

              <Stack gap={4}>
                <Text size="xs" fw={600} c="text.7" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                  {t("addBike.model")}
                </Text>
                <Autocomplete
                  placeholder={t("addBike.modelPlaceholder")}
                  limit={8}
                  leftSection={<Tag size={18} />}
                  value={form.values.model}
                  onChange={(value) => form.setFieldValue("model", value)}
                  radius="sm"
                  styles={inputStyles}
                  comboboxProps={dropdownProps}
                  data={brandModels}
                />
              </Stack>

              <Stack gap={4}>
                <Text size="xs" fw={600} c="text.7" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                  {t("addBike.year")}
                </Text>
                <Select
                  placeholder={t("addBike.yearPlaceholder")}
                  leftSection={<Calendar size={18} />}
                  data={YEAR_OPTIONS}
                  value={form.values.year}
                  onChange={(value) => form.setFieldValue("year", value)}
                  radius="sm"
                  styles={inputStyles}
                  comboboxProps={dropdownProps}
                />
              </Stack>

              <Button
                type="submit"
                leftSection={<Search size={18} />}
                loading={searchBike.isPending}
                disabled={!canSearch}
                fullWidth
                radius="sm"
                styles={{
                  root: {
                    "--mantine-color-disabled": "var(--mantine-color-cards-5)",
                    "--mantine-color-disabled-color": "var(--mantine-color-text-9)",
                  } as React.CSSProperties,
                }}
                style={{
                  height: "3rem",
                  // The glow belongs to the enabled state only.
                  boxShadow: canSearch ? "0px 0px 10px 0px rgba(255, 255, 0, 0.25)" : "none",
                }}
              >
                {t("addBike.findSpecification")}
              </Button>
            </Stack>
          </form>
        </Paper>
      )}

      {/* ----------- Result picker ----------- */}
      {/* Replaces the form: the user is done searching and now picks a match. */}
      {active === 0 && searchResults !== null && (
        <BikeSearchResults results={searchResults} selectedBikeUrl={selectedBikeUrl} onSelect={setSelectedBikeUrl} />
      )}

      {/* ----------- Lookup fallback ----------- */}
      {/* Kept below the form so the user can correct brand/model/year and retry. */}
      {active === 0 && showsFallback && (
        <BikeSearchFallback
          variant={searchFailed ? "failed" : "empty"}
          diagnosticCode={searchFailed ? diagnosticCode : undefined}
          onRetry={retrySearch}
          onEnterManually={enterManually}
          onSkip={skipStep}
        />
      )}

      {/* ----------- Step 2: specification ----------- */}
      {active === 1 && (
        <BikeSpecification
          bike={confirmedBike}
          fallbackName={`${form.values.brand} ${form.values.model}`.trim()}
          year={form.values.year}
          categories={bikeFormOptions?.bikeTypes ?? []}
          values={specification}
          onChange={(field, value) => setSpecification((current) => ({ ...current, [field]: value }))}
        />
      )}

      {/* ----------- Step 3: scraped components ----------- */}
      {active === 2 && (
        <BikeComponentList
          components={componentsQuery.data}
          // Without a scraped bike the query never runs, so it stays pending
          // forever — that is an empty list, not a load in progress.
          isLoading={confirmedBike !== null && componentsQuery.isPending}
          isError={componentsQuery.isError}
        />
      )}

      {/* ----------- Step footer ----------- */}
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
        {/* Picking a match is the only move that makes sense on the result
            list, and the header arrow already covers going back. */}
        {active === 0 && searchResults !== null ? (
          <Button
            leftSection={<Check size={18} />}
            onClick={confirmSelection}
            disabled={selectedBikeUrl === null}
            radius="sm"
            styles={{
              root: {
                "--mantine-color-disabled": "var(--mantine-color-cards-5)",
                "--mantine-color-disabled-color": "var(--mantine-color-text-9)",
              } as React.CSSProperties,
            }}
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
              onClick={prevStep}
              style={{ flex: 1, height: "3rem" }}
            >
              {t("action.back")}
            </Button>
            {/* The last step has nothing to advance to yet — saving the bike
                lands with the create call. */}
            {active < TOTAL_STEPS - 1 && (
              <Button
                color="primary.6"
                rightSection={<ChevronRight size={14} />}
                style={{ flex: 1, height: "3rem" }}
                onClick={nextStep}
              >
                {t("addBike.nextStep")}
              </Button>
            )}
          </>
        )}
      </Group>
    </Stack>
  );
}
