// PROTOTYPE (proto/desktop-wizards): the service wizard on desktop as one screen in three zones -
// which part, what was done, and the Service itself. Design: "BikeCheck desktop redesign" canvas.
import { Fragment, useEffect, useRef, useState, type ReactElement } from "react";
import { Box, Button, Group, Loader, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { ConfirmModal } from "@/components/ConfirmModal";
import { GroupedList } from "@/components/GroupedList";
import { catalogueLabel } from "@/features/service/serviceLabels";
import type { BikeCategory, CatalogueAction, CategoryActions } from "@/features/service/service.types";
import { categoryIcon } from "@/features/service/ui/categoryIcon";
import { useHeaderStore } from "@/store/store";
import { ActionRow } from "../ServiceActionsStep";
import type { PickedAction } from "../serviceWizard.types";
import { ServicePanelPrototype } from "./ServicePanelPrototype";
import { ServiceSavedModal } from "./ServiceSavedModal";
import { useServiceDesktopPrototype, type ServiceDesktopPrototypeState } from "./useServiceDesktopPrototype";

// Two rows: what names a column, then what fills it - so the category list, the first card and
// the panel all start on one edge. Below Tailwind's xl the categories fold into a row on top.
const GRID_CLASS =
  "grid items-start gap-x-6 gap-y-2.5 grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[13.75rem_minmax(0,1fr)_22.5rem]";
const NAV_LABEL_CELL = "hidden xl:block xl:col-start-1 xl:row-start-1 xl:self-end";
const NAV_CELL =
  "col-start-1 col-end-3 row-start-1 mb-3 flex flex-row flex-wrap gap-1 xl:col-end-2 xl:row-start-2 xl:mb-0 xl:sticky xl:top-16 xl:flex-col xl:flex-nowrap";
const HEADING_CELL = "col-start-1 row-start-2 xl:col-start-2 xl:row-start-1";
const CARDS_CELL = "col-start-1 row-start-3 xl:col-start-2 xl:row-start-2";
// Stretched to the row, so the panel inside has room to stay in view.
const PANEL_CELL = "col-start-2 row-start-3 self-stretch xl:col-start-3 xl:row-start-2";

// Sits beside a 14px label in a nav row.
const NAV_ICON_SIZE = 20;

export function ServiceDesktopPrototype(): ReactElement {
  const proto = useServiceDesktopPrototype();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const setHeaderOnBack = useHeaderStore((state) => state.setOnBack);
  // The one "discard?" left on desktop: leaving with work ticked.
  const [leaving, setLeaving] = useState(false);
  const [pendingBikeId, setPendingBikeId] = useState<number | null>(null);

  function leave(): void {
    if (location.key === "default") navigate("/service");
    else navigate(-1);
  }

  // Keep the registered handler current without repeated registration.
  const backRef = useRef<() => void>(() => {});
  useEffect(() => {
    backRef.current = (): void => {
      if (proto.pickedCount > 0 && !proto.saved) setLeaving(true);
      else leave();
    };
  });

  useEffect(() => {
    setHeaderOnBack(() => backRef.current());
    return () => setHeaderOnBack(null);
  }, [setHeaderOnBack]);

  // Back where the work was started from, as the phone's wizard goes after saving.
  function finish(): void {
    navigate(proto.entryBikeId === null ? "/service" : `/bikes/${String(proto.entryBikeId)}`, { replace: true });
  }

  function startAnother(): void {
    proto.reset();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function requestBike(bikeId: number): void {
    if (proto.pickedCount > 0) setPendingBikeId(bikeId);
    else proto.changeBike(bikeId);
  }

  if (proto.bikes === undefined) {
    return (
      <Group justify="center" p="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  if (proto.bikes.length === 0) {
    return (
      <Text fz={14} c="var(--color-text-dim)" p="md">
        {t("addService.noBikes")}
      </Text>
    );
  }

  return (
    <Box px="md" pt="sm" pb="xl">
      <Box className={GRID_CLASS}>
        <CategoryNav proto={proto} />
        <ActionsHeading proto={proto} />
        <ActionsList proto={proto} />
        <Box className={PANEL_CELL}>
          <ServicePanelPrototype proto={proto} onRequestBike={requestBike} />
        </Box>
      </Box>

      <ConfirmModal
        opened={leaving}
        onCancel={() => setLeaving(false)}
        onConfirm={() => {
          setLeaving(false);
          leave();
        }}
        title={t("addService.discardServiceTitle")}
        body={t("addService.discardServiceBody")}
        cancelLabel={t("addService.keep")}
        confirmLabel={t("addService.discard")}
      />
      <ConfirmModal
        opened={pendingBikeId !== null}
        onCancel={() => setPendingBikeId(null)}
        onConfirm={() => {
          if (pendingBikeId !== null) proto.changeBike(pendingBikeId);
          setPendingBikeId(null);
        }}
        title={t("addService.changeBikeTitle")}
        body={t("addService.changeBikeBody")}
        cancelLabel={t("addService.keep")}
        confirmLabel={t("addService.discard")}
      />
      <ServiceSavedModal opened={proto.saved} summary={proto.lastSaved} onAnother={startAnother} onDone={finish} />
    </Box>
  );
}

// Which part of the bike. The figure beside a category is how many of its actions are ticked.
function CategoryNav({ proto }: { proto: ServiceDesktopPrototypeState }): ReactElement {
  const { t } = useTranslation();

  return (
    <>
      <SectionTitle className={NAV_LABEL_CELL} px={12}>
        {t("addService.stepCategory")}
      </SectionTitle>
      <Box component="nav" aria-label={t("addService.stepCategory")} className={NAV_CELL}>
        {proto.categories?.map((category) => (
          <CategoryButton
            key={category.group_id}
            category={category}
            active={category.group_id === proto.categoryId}
            picked={proto.blocks.find((block) => block.categoryId === category.group_id)?.actions.length ?? 0}
            onChoose={() => proto.chooseCategory(category.group_id)}
          />
        ))}
      </Box>
    </>
  );
}

// The small capitals that name a column or a run of cards.
function SectionTitle({
  children,
  className,
  px,
  mt,
}: {
  children: string;
  className?: string;
  px?: number;
  mt?: number;
}): ReactElement {
  return (
    <Text
      fz={11}
      fw={600}
      tt="uppercase"
      lts="var(--tracking-label)"
      c="var(--color-text-dim)"
      className={className}
      px={px}
      mt={mt}
    >
      {children}
    </Text>
  );
}

function CategoryButton({
  category,
  active,
  picked,
  onChoose,
}: {
  category: BikeCategory;
  active: boolean;
  picked: number;
  onChoose: () => void;
}): ReactElement {
  const { t } = useTranslation();

  return (
    <UnstyledButton
      aria-current={active ? "true" : undefined}
      onClick={onChoose}
      className="hover-veil"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        minHeight: 40,
        padding: "8px 12px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        backgroundColor: active ? "var(--mantine-color-cards-6)" : "transparent",
        color: active ? "var(--mantine-color-primary-6)" : "var(--mantine-color-text-6)",
      }}
    >
      <Group component="span" gap={10} wrap="nowrap">
        {categoryIcon(category.group_name, NAV_ICON_SIZE)}
        <span>{catalogueLabel(category.group_i18n_key, category.group_name, t)}</span>
      </Group>
      {picked > 0 && (
        <Box
          component="span"
          className="tabular-nums"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 20,
            height: 20,
            padding: "0 6px",
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 700,
            backgroundColor: "var(--mantine-color-primary-6)",
            color: "var(--mantine-color-textDark-6)",
          }}
        >
          {picked}
        </Box>
      )}
    </UnstyledButton>
  );
}

interface ActionSectionData {
  title: string;
  actions: CatalogueAction[];
}

// Maintenance and Replacements are told apart before either is ticked (ADR 0003).
function actionSections(
  catalogue: CategoryActions | undefined,
  translate: (key: string) => string,
): ActionSectionData[] {
  if (catalogue === undefined) return [];
  return [
    {
      title: translate("addService.groupService"),
      actions: catalogue.actions.filter((action) => !action.replace_action),
    },
    {
      title: translate("addService.groupReplacement"),
      actions: catalogue.actions.filter((action) => action.replace_action),
    },
  ].filter((section) => section.actions.length > 0);
}

// Names the chosen category, and the first run of cards - so the cards themselves open the row below.
function ActionsHeading({ proto }: { proto: ServiceDesktopPrototypeState }): ReactElement | null {
  const { t } = useTranslation();
  const { catalogue } = proto;
  if (proto.categories?.length === 0) return null;
  const firstSection = actionSections(catalogue, t).at(0);

  return (
    <Box className={HEADING_CELL}>
      <Text component="h2" fw={700} fz={22} c="text.6" lts="var(--tracking-title)" m={0}>
        {catalogue === undefined ? "" : catalogueLabel(catalogue.group_i18n_key, catalogue.group_name, t)}
      </Text>
      <Text fz={14} c="var(--color-text-dim)" mt={6}>
        {t("addService.actionsHint")}
      </Text>
      {firstSection !== undefined && <SectionTitle mt={22}>{firstSection.title}</SectionTitle>}
    </Box>
  );
}

// What was done in the chosen category. The card is the phone's own, so both record the same way.
function ActionsList({ proto }: { proto: ServiceDesktopPrototypeState }): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { catalogue } = proto;

  // Nothing is mounted, so there is no work to record against.
  if (proto.categories?.length === 0) {
    return (
      <Stack gap="md" align="flex-start" className={CARDS_CELL}>
        <Text fw={600} fz={15} c="text.6">
          {t("addService.noComponentsTitle")}
        </Text>
        <Text fz={14} c="var(--color-text-dim)">
          {t("addService.noComponentsBody")}
        </Text>
        <Button variant="outline" radius="md" onClick={() => navigate(`/bikes/${String(proto.bikeId)}`)}>
          {t("addService.openBikeDetail")}
        </Button>
      </Stack>
    );
  }

  const pickedById = new Map<number, PickedAction>(
    (proto.blocks.find((block) => block.categoryId === proto.categoryId)?.actions ?? []).map((action) => [
      action.actionId,
      action,
    ]),
  );

  function renderAction(action: CatalogueAction): ReactElement {
    return (
      <ActionRow
        key={action.id}
        action={action}
        picked={pickedById.get(action.id)}
        opened={proto.openActionId === action.id}
        onToggleOpen={() => proto.setOpenActionId(proto.openActionId === action.id ? null : action.id)}
        onToggle={() => {
          proto.toggleAction(action);
          proto.setOpenActionId(pickedById.has(action.id) ? null : action.id);
        }}
        onUpdate={(patch) => proto.updateAction(action.id, patch)}
        onToggleTag={(tagName) => proto.toggleActionTag(action.id, tagName)}
      />
    );
  }

  return (
    <Stack gap={10} className={CARDS_CELL} style={{ minWidth: 0 }}>
      {(proto.categoriesLoading || proto.catalogueLoading) && (
        <Group justify="center" p="xl">
          <Loader size="sm" />
        </Group>
      )}
      {proto.categoriesFailed && (
        <Text size="sm" c="red.5">
          {t("addService.categoriesFailed")}
        </Text>
      )}
      {proto.catalogueFailed && (
        <Text size="sm" c="red.5">
          {t("addService.actionsFailed")}
        </Text>
      )}
      {catalogue?.actions.length === 0 && (
        <Text fz={14} c="var(--color-text-dim)">
          {t("addService.noActions")}
        </Text>
      )}

      {actionSections(catalogue, t).map((section, index) => (
        <Fragment key={section.title}>
          {/* The first run is named in the heading above, so its card starts this row. */}
          {index > 0 && <SectionTitle mt={12}>{section.title}</SectionTitle>}
          <GroupedList>{section.actions.map(renderAction)}</GroupedList>
        </Fragment>
      ))}
    </Stack>
  );
}
