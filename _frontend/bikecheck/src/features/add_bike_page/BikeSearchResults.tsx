// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import { Button, Group, Image, Paper, Radio, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import type { BikeSearchResult } from "../bikes/bikes.types";

// Limit initially rendered image cards on mobile.
const PAGE_SIZE = 10;

interface BikeSearchResultsProps {
  results: BikeSearchResult[];
  // bikeUrl identifies the pick — it is what the component lookup needs next.
  selectedBikeUrl: string | null;
  onSelect: (bikeUrl: string) => void;
}

// Render selection list while the footer confirms the pick.
export function BikeSearchResults({ results, selectedBikeUrl, onSelect }: BikeSearchResultsProps): ReactElement {
  const { t } = useTranslation();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleResults = results.slice(0, visibleCount);
  const remainingCount = results.length - visibleResults.length;

  function showMore(): void {
    setVisibleCount((current) => current + PAGE_SIZE);
  }

  return (
    <Stack gap="md">
      <Text size="sm" c="text.7">
        {t("addBike.selectModelBody")}
      </Text>

      <Text size="sm" fw={600} c="text.7">
        {t("addBike.resultsFound", { count: results.length })}
      </Text>

      {visibleResults.map((result) => {
        const isSelected = result.bikeUrl === selectedBikeUrl;

        return (
          <UnstyledButton key={result.bikeUrl} onClick={() => onSelect(result.bikeUrl)}>
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
                  <Text fw={500} size="md" c="text.8">
                    {result.bikeBrand}
                  </Text>
                  <Group justify="space-between" wrap="nowrap" align="center">
                    <Text fw={700} size="md" c="text.6">
                      {result.name}
                    </Text>
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
