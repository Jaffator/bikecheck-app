// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { type ReactElement } from "react";
import { Autocomplete, Button, Paper, Select, Stack, Text } from "@mantine/core";
import { type UseFormReturnType } from "@mantine/form";
import { useTranslation } from "react-i18next";
import { Calendar, Search, Tag } from "lucide-react";
import { inputStyles, dropdownProps, disabledButtonStyles } from "./formStyles";
import type { AddBikeIdentityValues } from "./useAddBikeWizard";

// Descending so the most likely picks (recent bikes) sit at the top of the list.
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 20 }, (_, i) => String(CURRENT_YEAR + 1 - i));

interface BikeIdentityFormProps {
  form: UseFormReturnType<AddBikeIdentityValues>;
  brandNames: string[];
  // Only the models of the brand already picked — the full list would offer
  // models that cannot belong to it.
  brandModels: string[];
  canSearch: boolean;
  isSearching: boolean;
  onSubmit: (values: AddBikeIdentityValues) => void;
}

function FieldLabel({ children }: { children: string }): ReactElement {
  return (
    <Text size="xs" fw={600} c="text.7" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
      {children}
    </Text>
  );
}

// Step 1 of the "Add new bike" wizard — brand/model/year used to look up the
// bike's default specification.
export function BikeIdentityForm({
  form,
  brandNames,
  brandModels,
  canSearch,
  isSearching,
  onSubmit,
}: BikeIdentityFormProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Paper bg="cards.6" p="md" radius="md">
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="md">
          <Stack gap={4}>
            <FieldLabel>{t("addBike.brand")}</FieldLabel>
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
            <FieldLabel>{t("addBike.model")}</FieldLabel>
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
            <FieldLabel>{t("addBike.year")}</FieldLabel>
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
            loading={isSearching}
            disabled={!canSearch}
            fullWidth
            radius="sm"
            styles={disabledButtonStyles}
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
  );
}
