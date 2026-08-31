// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Button, Group, Loader, Paper, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { categoryIcon } from "@/features/service/categoryIcon";
import { useBikeCategories } from "@/features/service/service.queries";
import type { BikeCategory } from "@/features/service/service.types";
import { catalogueLabel } from "@/features/service/serviceLabels";

const TILE_ICON_SIZE = 30;

interface ServiceCategoryStepProps {
  bikeId: number | null;
  onChoose: (category: BikeCategory) => void;
}

// Which part of the bike was worked on. Only the categories the bike actually has parts
// in are offered, so a rigid bike is never asked about its suspension.
export function ServiceCategoryStep({ bikeId, onChoose }: ServiceCategoryStepProps): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: categories, isLoading, isError } = useBikeCategories(bikeId);

  if (isLoading) {
    return (
      <Group justify="center" p="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  if (isError) {
    return (
      <Text size="sm" c="red.5">
        {t("addService.categoriesFailed")}
      </Text>
    );
  }

  // Nothing is mounted, so there is no work to record. Say so, and point at the place
  // where parts are added, rather than opening an empty list.
  if ((categories?.length ?? 0) === 0) {
    return (
      <Stack gap="md" align="flex-start">
        <Text fw={600} fz={15} c="text.6">
          {t("addService.noComponentsTitle")}
        </Text>
        <Text fz={14} c="var(--color-text-dim)">
          {t("addService.noComponentsBody")}
        </Text>
        <Button
          variant="outline"
          color="secondary.6"
          radius="md"
          onClick={() => {
            navigate(`/bikes/${bikeId}`);
          }}
        >
          {t("addService.openBikeDetail")}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      <SimpleGrid cols={2} spacing="sm">
        {categories?.map((category) => (
          <CategoryTile key={category.group_id} category={category} onChoose={() => onChoose(category)} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}

// One category, with how many of the bike's parts sit in it.
function CategoryTile({ category, onChoose }: { category: BikeCategory; onChoose: () => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <UnstyledButton
      onClick={() => {
        onChoose();
      }}
      style={{ display: "block", width: "100%" }}
    >
      <Paper
        radius="lg"
        p="md"
        style={{
          // Colour, glow and inner edge all live in this one object: `bg` would emit the
          // `background` shorthand and wipe the gradient - see docs/ui/card-surface.md.
          backgroundColor: "var(--mantine-color-cards-6)",
          backgroundImage: "var(--card-glow)",
          border: "1px solid var(--mantine-color-cards-6)",
          boxShadow: "var(--elev-panel)",
          height: "100%",
        }}
        className="active:scale-[0.985]"
      >
        <Stack gap="xs" align="flex-start">
          {categoryIcon(category.group_name, TILE_ICON_SIZE)}
          <Text fw={600} fz={15} c="text.6" lineClamp={2}>
            {catalogueLabel(category.group_i18n_key, category.group_name, t)}
          </Text>
          <Text fz={13} c="var(--color-text-dim)">
            {t("addService.componentCount", {
              count: category.component_count,
            })}
          </Text>
        </Stack>
      </Paper>
    </UnstyledButton>
  );
}
