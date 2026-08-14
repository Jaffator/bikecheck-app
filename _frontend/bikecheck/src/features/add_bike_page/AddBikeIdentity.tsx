// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import { Button, Group, Paper, Select, Stack, Stepper, Text, Autocomplete } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Tag, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import { useBikeFormOptions, useSearchBikeExternal } from "../bikes/bikes.queries";
import { ApiError } from "@/api/client";
import { BikeSearchFallback } from "./BikeSearchFallback";
import { BikeSearchResults } from "./BikeSearchResults";

const TOTAL_STEPS = 3;

// Descending so the most likely picks (recent bikes) sit at the top of the list.
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 20 }, (_, i) => String(CURRENT_YEAR + 1 - i));

const inputStyles = {
  input: {
    backgroundColor: "var(--mantine-color-inputs-6)",
    border: "none",
    height: "3rem",
    color: "var(--mantine-color-text-6)",
    "--input-placeholder-color": "var(--mantine-color-text-9)",
  } as React.CSSProperties,
};

// The dropdown renders in a portal, so it needs its own styles.
const dropdownProps = {
  withinPortal: true,
  styles: {
    dropdown: {
      backgroundColor: "var(--mantine-color-cards-6)",
      border: "1px solid var(--mantine-color-cards-5)",
      color: "var(--mantine-color-text-6)",
    },
  },
};
// Step 1 of the "Add new bike" wizard — brand/model/year used to look up the
// bike's default specification. The lookup itself lands with the next step.
export function AddBikeIdentity(): ReactElement {
  const { data: bikeFormOptions } = useBikeFormOptions();
  const searchBike = useSearchBikeExternal();
  const [active, setActive] = useState(0);
  const [selectedBikeUrl, setSelectedBikeUrl] = useState<string | null>(null);
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  // On the first step there is no previous step, so back leaves the wizard.
  function prevStep(): void {
    tapFeedback();

    if (active === 0) {
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

  // Drops the result list and the pick, bringing the search form back.
  function changeSearch(): void {
    tapFeedback();
    setSelectedBikeUrl(null);
    searchBike.reset();
  }

  function confirmSelection(): void {
    tapFeedback();
    console.log("selected bike", selectedBikeUrl);
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

  return (
    <Stack gap="lg" px="md" pt="md" pb="6rem">
      {/* ----------- Progress indicator ----------- */}
      <Stack gap="xs">
        <Stepper
          active={active}
          onStepClick={setActive}
          size="xs"
          iconSize={25}
          completedIcon={null}
          styles={{
            root: {
              "--stepper-outline-color": "var(--mantine-color-cards-6)",
              "--stepper-color": "var(--mantine-color-primary-6)",
              "--stepper-icon-color": "var(--mantine-color-textDark-6)",
            } as React.CSSProperties,
          }}
        >
          <Stepper.Step aria-label={t("addBike.stepIdentity")} withIcon>
            {/* ----------- Header ----------- */}
            {!searchFailed && !searchEmpty && (
              <Stack gap="xs">
                <Text fw={700} size="xl" c="text.6">
                  {searchResults === null ? t("addBike.identityTitle_step1") : t("addBike.selectModelTitle")}
                </Text>
                {searchResults === null && (
                  <Text size="md" c="text.7">
                    {t("addBike.identityBody_step1")}
                  </Text>
                )}
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
                {t("addBike.identityBody_step3")}
              </Text>
            </Stack>
          </Stepper.Step>
        </Stepper>
      </Stack>

      {/* ----------- Form card ----------- */}
      {/* Hidden once the search produced something to react to. */}
      {!searchFailed && !searchEmpty && searchResults === null && (
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
      {searchResults !== null && (
        <BikeSearchResults
          results={searchResults}
          selectedBikeUrl={selectedBikeUrl}
          onSelect={setSelectedBikeUrl}
          onConfirm={confirmSelection}
          onChangeSearch={changeSearch}
        />
      )}

      {/* ----------- Lookup fallback ----------- */}
      {/* Kept below the form so the user can correct brand/model/year and retry. */}
      {(searchFailed || searchEmpty) && (
        <BikeSearchFallback
          variant={searchFailed ? "failed" : "empty"}
          diagnosticCode={searchFailed ? diagnosticCode : undefined}
          onRetry={retrySearch}
          onEnterManually={enterManually}
          onSkip={skipStep}
        />
      )}

      {/* ----------- Step footer ----------- */}
      <Group
        justify="space-between"
        gap="sm"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "1rem",
          paddingBottom: "calc(1rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))",
          backgroundColor: "var(--mantine-color-background-9)",
          borderTop: "1px solid var(--mantine-color-other-borderSubtle)",
        }}
      >
        <Button
          variant="outline"
          color="secondary.6"
          leftSection={<ChevronLeft size={14} />}
          onClick={prevStep}
          style={{ flex: 1, height: "3rem" }}
        >
          {t("action.back")}
        </Button>
        <Button
          color="primary.6"
          rightSection={<ChevronRight size={14} />}
          style={{ flex: 1, height: "3rem" }}
          onClick={nextStep}
        >
          {t("addBike.nextStep")}
        </Button>
      </Group>
    </Stack>
  );
}
