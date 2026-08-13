// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Button, Group, Paper, Select, Stack, Stepper, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Tag, Bike, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";

const TOTAL_STEPS = 3;
const CURRENT_STEP = 1;

// Descending so the most likely picks (recent bikes) sit at the top of the list.
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 20 }, (_, i) => String(CURRENT_YEAR + 1 - i));

const inputStyles = {
  input: {
    backgroundColor: "var(--mantine-color-inputs-6)",
    border: "none",
    height: "3rem",
    color: "var(--mantine-color-text-6)",
  },
};

// Step 1 of the "Add new bike" wizard — brand/model/year used to look up the
// bike's default specification. The lookup itself lands with the next step.
export function AddBikeIdentity(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const form = useForm({
    initialValues: {
      brand: "",
      model: "",
      year: null as string | null,
    },
  });

  function goBack(): void {
    tapFeedback();
    navigate(-1);
  }

  return (
    <Stack gap="lg" px="md" pt="md" pb="6rem">
      {/* ----------- Progress indicator ----------- */}
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="xs" fw={600} c="other.primaryLight" tt="uppercase" style={{ letterSpacing: "0.1em" }}>
            {t("addBike.stepOf", { current: CURRENT_STEP, total: TOTAL_STEPS })}
          </Text>
          <Text size="xs" fw={600} c="text.6" tt="uppercase" style={{ letterSpacing: "0.1em" }}>
            {t("addBike.stepIdentity")}
          </Text>
        </Group>
        <Stepper
          active={CURRENT_STEP - 1}
          color="var(--mantine-color-primary-6)"
          size="xs"
          iconSize={25}
          completedIcon={null}
          styles={{
            stepIcon: { backgroundColor: "var(--mantine-color-cards-6)", borderColor: "var(--mantine-color-cards-6)" },
            separator: { backgroundColor: "var(--mantine-color-cards-6)" },
          }}
        >
          {/* The active step overrides the shared inactive styling with a filled primary icon. */}
          <Stepper.Step
            aria-label={t("addBike.stepIdentity")}
            withIcon
            styles={{
              stepIcon: { backgroundColor: "var(--mantine-color-primary-6)", borderColor: "var(--mantine-color-primary-6)" },
              stepIconContent: { color: "var(--mantine-color-textDark-6)" },
            }}
          />
          <Stepper.Step aria-label={t("addBike.stepSpecification")} withIcon />
          <Stepper.Step aria-label={t("addBike.stepPhotos")} withIcon />
        </Stepper>
      </Stack>

      {/* ----------- Header ----------- */}
      <Stack gap="xs">
        <Text fw={700} size="xl" c="text.6">
          {t("addBike.identityTitle")}
        </Text>
        <Text size="md" c="text.7">
          {t("addBike.identityBody")}
        </Text>
      </Stack>

      {/* ----------- Form card ----------- */}
      <Paper bg="cards.6" p="md" radius="md">
        <Stack gap="md">
          <Stack gap={4}>
            <Text size="xs" fw={600} c="text.7" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
              {t("addBike.brand")}
            </Text>
            <TextInput
              placeholder={t("addBike.brandPlaceholder")}
              leftSection={<Tag size={18} />}
              value={form.values.brand}
              onChange={(event) => form.setFieldValue("brand", event.currentTarget.value)}
              radius="sm"
              styles={inputStyles}
            />
          </Stack>

          <Stack gap={4}>
            <Text size="xs" fw={600} c="text.7" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
              {t("addBike.model")}
            </Text>
            <TextInput
              placeholder={t("addBike.modelPlaceholder")}
              leftSection={<Bike size={18} />}
              value={form.values.model}
              onChange={(event) => form.setFieldValue("model", event.currentTarget.value)}
              radius="sm"
              styles={inputStyles}
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
              comboboxProps={{ withinPortal: true }}
            />
          </Stack>

          <Button
            leftSection={<Search size={18} />}
            fullWidth
            radius="sm"
            style={{ height: "3rem", boxShadow: "0px 0px 10px 0px rgba(255, 255, 0, 0.25)" }}
          >
            {t("addBike.findSpecification")}
          </Button>
        </Stack>
      </Paper>

      {/* ----------- Step footer ----------- */}
      <Group
        justify="space-between"
        gap="sm"
        style={{
          position: "fixed",
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
          onClick={goBack}
          style={{ flex: 1, height: "3rem" }}
        >
          {t("action.back")}
        </Button>
        <Button color="primary.6" rightSection={<ChevronRight size={14} />} style={{ flex: 1, height: "3rem" }}>
          {t("addBike.nextStep")}
        </Button>
      </Group>
    </Stack>
  );
}
