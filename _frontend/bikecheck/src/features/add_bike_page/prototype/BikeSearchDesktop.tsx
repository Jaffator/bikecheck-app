// PROTOTYPE (proto/desktop-wizards): step 1 on desktop - the search stays on screen above a grid of matches.
import { useState, type ReactElement } from "react";
import {
  Autocomplete,
  Badge,
  Box,
  Button,
  Group,
  Image,
  Paper,
  Select,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { BikeSearchResult } from "@/features/bikes/bikes.types";
import { FieldLabel } from "../BikeSpecification";
import { disabledButtonStyles, dropdownProps, inputStyles } from "../formStyles";
import type { AddBikeWizard } from "../useAddBikeWizard";
import { cardSurface, imageSrc } from "./bikeProto";
import { CollectionLookupModal, SearchLookupModal } from "./LookupModalDesktop";

// Three rows of four on a laptop.
const PAGE_SIZE = 12;

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 20 }, (_, index) => String(CURRENT_YEAR + 1 - index));

export function BikeSearchDesktop({ wizard }: { wizard: AddBikeWizard }): ReactElement {
  const { t } = useTranslation();
  const { form, openCollection, searchResults, pickedFrom } = wizard;
  // Until a collection's own list is in, the list it was picked from stays under its modal.
  const listCollection = pickedFrom !== null ? pickedFrom.collection : openCollection;
  const listResults = pickedFrom !== null ? pickedFrom.results : searchResults;

  return (
    <Stack gap="lg">
      <Paper radius="lg" p="md" style={cardSurface}>
        <form onSubmit={form.onSubmit(wizard.submitSearch)}>
          <Group gap="sm" align="flex-end" wrap="wrap">
            <Stack gap={4} style={{ flex: "2 1 10rem" }}>
              <FieldLabel>{t("addBike.brand")}</FieldLabel>
              <Autocomplete
                placeholder={t("addBike.brandPlaceholder")}
                data={wizard.brandNames}
                maxDropdownHeight={280}
                value={form.values.brand}
                onChange={(value) => form.setFieldValue("brand", value)}
                styles={inputStyles}
                comboboxProps={dropdownProps}
              />
            </Stack>
            <Stack gap={4} style={{ flex: "2 1 10rem" }}>
              <FieldLabel>{t("addBike.model")}</FieldLabel>
              <Autocomplete
                placeholder={t("addBike.modelPlaceholder")}
                data={wizard.brandModels}
                limit={8}
                value={form.values.model}
                onChange={(value) => form.setFieldValue("model", value)}
                styles={inputStyles}
                comboboxProps={dropdownProps}
              />
            </Stack>
            <Stack gap={4} style={{ flex: "1 1 7rem" }}>
              <FieldLabel>{t("addBike.year")}</FieldLabel>
              <Select
                placeholder={t("addBike.yearPlaceholder")}
                data={YEAR_OPTIONS}
                value={form.values.year}
                onChange={(value) => form.setFieldValue("year", value)}
                styles={inputStyles}
                comboboxProps={dropdownProps}
              />
            </Stack>
            <Button
              type="submit"
              variant="outline"
              radius="md"
              leftSection={<Search size={16} color="var(--mantine-color-primary-5)" />}
              disabled={!wizard.canSubmitSearch}
              styles={disabledButtonStyles}
              style={{ height: "2.4rem" }}
            >
              {t("addBike.findSpecification")}
            </Button>
          </Group>
        </form>
      </Paper>

      {listCollection !== null && (
        <Stack gap={4} align="flex-start">
          <Button
            variant="subtle"
            color="secondary.6"
            leftSection={<ChevronLeft size={18} />}
            onClick={wizard.leaveCollection}
            radius="sm"
            style={{ paddingLeft: 0 }}
          >
            {t("addBike.backToResults")}
          </Button>
          <Text fw={700} fz={15} c="text.6">
            {listCollection.name}
          </Text>
          {listResults !== null && (
            <Text fz={13} c="var(--color-text-dim)">
              {t("addBike.collectionBody")}
            </Text>
          )}
        </Stack>
      )}

      {listCollection === null && listResults !== null && (
        <Group gap="4px 12px" align="baseline">
          <Text fw={700} fz={15} c="text.6">
            {t("addBike.resultsFound", { count: listResults.length })}
          </Text>
          <Text fz={13} c="var(--color-text-dim)">
            {t("addBike.selectModelBody")}
          </Text>
        </Group>
      )}

      {listResults !== null && (
        <ResultsGrid
          // A new list starts from its first page again.
          key={`${listCollection?.bikeUrl ?? "search"}:${String(listResults.length)}`}
          results={listResults}
          selectedBikeUrl={wizard.selectedBikeUrl}
          onSelect={wizard.selectBike}
          onOpenCollection={wizard.enterCollection}
        />
      )}

      <SearchLookupModal wizard={wizard} />
      <CollectionLookupModal wizard={wizard} />
    </Stack>
  );
}

function ResultsGrid({
  results,
  selectedBikeUrl,
  onSelect,
  onOpenCollection,
}: {
  results: BikeSearchResult[];
  selectedBikeUrl: string | null;
  onSelect: (bikeUrl: string) => void;
  onOpenCollection: (collection: BikeSearchResult) => void;
}): ReactElement {
  const { t } = useTranslation();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const remaining = results.length - visibleCount;

  return (
    <>
      <Box style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(13rem, 1fr))", gap: "1rem" }}>
        {results.slice(0, visibleCount).map((result) => (
          <ResultCard
            key={result.bikeUrl}
            result={result}
            selected={result.kind !== "family" && result.bikeUrl === selectedBikeUrl}
            onPick={() => (result.kind === "family" ? onOpenCollection(result) : onSelect(result.bikeUrl))}
          />
        ))}
      </Box>
      {remaining > 0 && (
        <Group justify="center">
          <Button variant="outline" radius="md" onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}>
            {t("addBike.showMoreResults", { count: Math.min(PAGE_SIZE, remaining) })}
          </Button>
        </Group>
      )}
    </>
  );
}

// A collection is opened, never picked - the bike is one level deeper.
function ResultCard({
  result,
  selected,
  onPick,
}: {
  result: BikeSearchResult;
  selected: boolean;
  onPick: () => void;
}): ReactElement {
  const { t } = useTranslation();
  const isCollection = result.kind === "family";
  const photo = imageSrc(result);

  return (
    <UnstyledButton aria-pressed={isCollection ? undefined : selected} onClick={onPick} className="hover-veil" style={{ borderRadius: 14 }}>
      <Paper
        radius={14}
        p={10}
        h="100%"
        style={{
          ...cardSurface,
          border: selected ? "1px solid var(--mantine-color-primary-6)" : cardSurface.border,
        }}
      >
        <Stack gap={10}>
          {photo !== null ? (
            <Image src={photo} alt={result.name} h={124} fit="contain" bg="white" radius="sm" loading="lazy" />
          ) : (
            <Box h={124} bg="cards.7" style={{ borderRadius: "var(--mantine-radius-sm)" }} />
          )}
          <Group justify="space-between" wrap="nowrap" gap={8} px={4} pb={4}>
            <Stack gap={2} style={{ minWidth: 0 }}>
              <Group gap={6} wrap="nowrap">
                <Text fz={13} c="var(--color-text-dim)" lineClamp={1}>
                  {result.bikeBrand}
                </Text>
                {isCollection && (
                  <Badge color="secondary.6" variant="light" radius="sm" size="sm" style={{ flexShrink: 0 }}>
                    {t("addBike.collectionBadge")}
                  </Badge>
                )}
              </Group>
              <Text fz={15} fw={700} c="text.6" lineClamp={2}>
                {result.name}
              </Text>
            </Stack>
            {isCollection ? (
              <ChevronRight size={20} color="var(--mantine-color-secondary-6)" aria-hidden style={{ flexShrink: 0 }} />
            ) : (
              <Box
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 20,
                  height: 20,
                  flexShrink: 0,
                  borderRadius: "50%",
                  border: `1.5px solid ${selected ? "var(--mantine-color-primary-6)" : "var(--mantine-color-cards-3)"}`,
                  backgroundColor: selected ? "var(--mantine-color-primary-6)" : "transparent",
                  color: "var(--mantine-color-textDark-6)",
                }}
              >
                {selected && <Check size={12} strokeWidth={3.5} />}
              </Box>
            )}
          </Group>
        </Stack>
      </Paper>
    </UnstyledButton>
  );
}
