// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { type ReactElement } from "react";
import { Button, Group, Image, Paper, Radio, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import type { BikeSearchResult } from "../bikes/bikes.types";

interface BikeSearchResultsProps {
  results: BikeSearchResult[];
  // bikeUrl identifies the pick — it is what the component lookup needs next.
  selectedBikeUrl: string | null;
  onSelect: (bikeUrl: string) => void;
  onConfirm: () => void;
  onChangeSearch: () => void;
}

export function BikeSearchResults({
  results,
  selectedBikeUrl,
  onSelect,
  onConfirm,
  onChangeSearch,
}: BikeSearchResultsProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <Text size="sm" c="text.7">
        {t("addBike.selectModelBody")}
      </Text>

      {results.map((result) => {
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
                  <Image src={result.imageUrl} alt={result.name} h={160} fit="contain" bg="white" radius="sm" />
                )}
                <Group justify="space-between" wrap="nowrap" align="center">
                  <Text fw={700} size="md" c="text.6">
                    {result.}
                  </Text>
                  <Text fw={700} size="md" c="text.6">
                    {result.name}
                  </Text>
                  <Radio checked={isSelected} onChange={() => onSelect(result.bikeUrl)} aria-label={result.name} />
                </Group>
              </Stack>
            </Paper>
          </UnstyledButton>
        );
      })}

      <Button
        leftSection={<Check size={18} />}
        onClick={onConfirm}
        disabled={selectedBikeUrl === null}
        fullWidth
        radius="sm"
        style={{ height: "3rem" }}
      >
        {t("addBike.confirmSelection")}
      </Button>

      <Button variant="subtle" color="secondary.6" onClick={onChangeSearch} fullWidth radius="sm">
        {t("addBike.changeSearch")}
      </Button>
    </Stack>
  );
}
