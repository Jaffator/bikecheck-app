// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import { Button, Group, Paper, Select, Stack, Stepper, Text, TextInput, Autocomplete } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Tag, Bike, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import { useBikeFormOptions } from "../bikes/bikes.queries";

const TOTAL_STEPS = 3;

// Descending so the most likely picks (recent bikes) sit at the top of the list.
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 20 }, (_, i) => String(CURRENT_YEAR + 1 - i));
const BRAND_OPTIONS = ["Trek", "Specialized", "Canyon", "Giant", "Cube", "Scott", "Merida"];

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
  const { data: bikeFormOptions, isLoading, error } = useBikeFormOptions();
  const [active, setActive] = useState(0);
  const { t } = useTranslation();
  const navigate = useNavigate();
  console.log(bikeFormOptions, "bikeFormOptions");

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

  const form = useForm({
    initialValues: {
      brand: "",
      model: "",
      year: null as string | null,
    },
  });

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
            <Stack gap="xs">
              <Text fw={700} size="xl" c="text.6">
                {t("addBike.identityTitle_step1")}
              </Text>
              <Text size="md" c="text.7">
                {t("addBike.identityBody_step1")}
              </Text>
            </Stack>
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
      <Paper bg="cards.6" p="md" radius="md">
        <Stack gap="md">
          <Stack gap={4}>
            <Text size="xs" fw={600} c="text.7" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
              {t("addBike.brand")}
            </Text>
            <Autocomplete
              placeholder={t("addBike.brandPlaceholder")}
              data={bikeFormOptions?.bikeBrands ?? BRAND_OPTIONS}
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
              comboboxProps={dropdownProps}
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
