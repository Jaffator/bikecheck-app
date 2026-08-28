// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import { Badge, Button, Group, Image, Paper, Radio, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { BikeSearchResult } from "../bikes/bikes.types";

// Limit initially rendered image cards on mobile.
const PAGE_SIZE = 10;

interface BikeSearchResultsProps {
  results: BikeSearchResult[];
  // bikeUrl identifies the pick — it is what the component lookup needs next.
  selectedBikeUrl: string | null;
  onSelect: (bikeUrl: string) => void;
  // Set while the list shows one collection instead of the search results.
  openCollection: BikeSearchResult | null;
  onOpenCollection: (collection: BikeSearchResult) => void;
  onLeaveCollection: () => void;
}

// Render selection list while the footer confirms the pick.
export function BikeSearchResults({
  results,
  selectedBikeUrl,
  onSelect,
  openCollection,
  onOpenCollection,
  onLeaveCollection,
}: BikeSearchResultsProps): ReactElement {
  const { t } = useTranslation();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleResults = results.slice(0, visibleCount);
  const remainingCount = results.length - visibleResults.length;

  function showMore(): void {
    setVisibleCount((current) => current + PAGE_SIZE);
  }

  return (
    <Stack gap="md">
      {openCollection !== null ? (
        // Inside a collection the result count would be counting variants, not
        // matches, so the collection names itself instead.
        <Stack gap="xs">
          <Button
            variant="subtle"
            color="secondary.6"
            leftSection={<ChevronLeft size={18} />}
            onClick={onLeaveCollection}
            radius="sm"
            style={{ alignSelf: "flex-start", paddingLeft: 0 }}
          >
            {t("addBike.backToResults")}
          </Button>

          <Text fw={700} size="lg" c="text.6">
            {openCollection.name}
          </Text>

          <Text size="sm" c="text.7">
            {t("addBike.collectionBody")}
          </Text>
        </Stack>
      ) : (
        <>
          <Text size="sm" c="text.7">
            {t("addBike.selectModelBody")}
          </Text>

          <Text size="sm" fw={600} c="text.7">
            {t("addBike.resultsFound", { count: results.length })}
          </Text>
        </>
      )}

      {visibleResults.map((result) => {
        // A collection is opened, never picked — the bike is one level deeper.
        const isCollection = result.kind === "family";
        const isSelected = !isCollection && result.bikeUrl === selectedBikeUrl;

        return (
          <UnstyledButton
            key={result.bikeUrl}
            onClick={() => (isCollection ? onOpenCollection(result) : onSelect(result.bikeUrl))}
          >
            <Paper
              bg="cards.6"
              p="md"
              radius="md"
              style={{
                border: isSelected
                  ? "1px solid var(--mantine-color-primary-6)"
                  : "1px solid var(--mantine-color-other-borderSubtle)",
              }}
            >
              <Stack gap="sm">
                {result.imageUrl && (
                  <Image
                    src={result.imageUrl}
                    alt={result.name}
                    h={160}
                    fit="contain"
                    bg="white"
                    radius="sm"
                    loading="lazy"
                  />
                )}
                <Stack gap={0}>
                  <Group gap="xs" wrap="nowrap">
                    <Text fw={500} size="md" c="text.8">
                      {result.bikeBrand}
                    </Text>
                    {isCollection && (
                      <Badge color="secondary.6" variant="light" radius="sm" size="sm">
                        {t("addBike.collectionBadge")}
                      </Badge>
                    )}
                  </Group>
                  <Group justify="space-between" wrap="nowrap" align="center">
                    <Text fw={700} size="md" c="text.6">
                      {result.name}
                    </Text>
                    {isCollection ? (
                      <ChevronRight size={22} color="var(--mantine-color-secondary-6)" aria-hidden />
                    ) : (
                      <Radio
                        checked={isSelected}
                        onChange={() => onSelect(result.bikeUrl)}
                        aria-label={result.name}
                        styles={{
                          radio: {
                            backgroundColor: "transparent",
                            borderWidth: 3,
                            borderColor: isSelected ? "var(--mantine-color-primary-6)" : "var(--mantine-color-cards-5)",
                          },
                          icon: { color: "var(--mantine-color-primary-6)" },
                        }}
                      />
                    )}
                  </Group>
                </Stack>
              </Stack>
            </Paper>
          </UnstyledButton>
        );
      })}

      {remainingCount > 0 && (
        <Button
          variant="subtle"
          color="secondary.6"
          leftSection={<ChevronDown size={18} />}
          onClick={showMore}
          fullWidth
          radius="sm"
          style={{ height: "3rem" }}
        >
          {t("addBike.showMoreResults", { count: remainingCount })}
        </Button>
      )}
    </Stack>
  );
}
