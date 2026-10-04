// PROTOTYPE (proto/desktop-wizards): the service wizard on desktop as one screen in three zones -
// which part, what was done, and the Service itself. Design: "BikeCheck desktop redesign" canvas.
import { useEffect, useRef, useState, type ReactElement } from "react";
import { Box, Button, Group, Loader, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { ConfirmModal } from "@/components/ConfirmModal";
import { catalogueLabel } from "@/features/service/serviceLabels";
import type { BikeCategory, CatalogueAction } from "@/features/service/service.types";
import { useHeaderStore } from "@/store/store";
import { ActionRow } from "../ServiceActionsStep";
import type { PickedAction } from "../serviceWizard.types";
import { COPY } from "./serviceCopy";
import { ServicePanelPrototype } from "./ServicePanelPrototype";
import { useServiceDesktopPrototype, type ServiceDesktopPrototypeState } from "./useServiceDesktopPrototype";

// Below Tailwind's xl the category nav folds into a row above the actions, so the middle keeps its width.
const GRID_CLASS = "grid items-start gap-6 grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[13.75rem_minmax(0,1fr)_22.5rem]";

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
        {COPY.noBikes}
      </Text>
    );
  }

  return (
    <Box px="md" pt="sm" pb="xl">
      <Box className={GRID_CLASS}>
        <CategoryNav proto={proto} />
        <ActionsColumn proto={proto} />
        <Box className="col-start-2 row-start-1 row-span-2 self-stretch xl:col-start-3 xl:row-span-1">
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
        title={COPY.changeBikeTitle}
        body={COPY.changeBikeBody}
        cancelLabel={t("addService.keep")}
        confirmLabel={t("addService.discard")}
      />
    </Box>
  );
}

// Which part of the bike. The figure beside a category is how many of its actions are ticked.
function CategoryNav({ proto }: { proto: ServiceDesktopPrototypeState }): ReactElement {
  const { t } = useTranslation();

  return (
    <Box
      component="nav"
      aria-label={t("addService.stepCategory")}
      className="col-start-1 row-start-1 flex flex-row flex-wrap gap-1 xl:sticky xl:top-16 xl:flex-col xl:flex-nowrap"
    >
      <Text
        fz={11}
        fw={600}
        tt="uppercase"
        lts="var(--tracking-label)"
        c="var(--color-text-dim)"
        px={12}
        mb={8}
        className="hidden xl:block"
      >
        {t("addService.stepCategory")}
      </Text>
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
      <span>{catalogueLabel(category.group_i18n_key, category.group_name, t)}</span>
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

// What was done in the chosen category. The card is the phone's own, so both record the same way.
function ActionsColumn({ proto }: { proto: ServiceDesktopPrototypeState }): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { catalogue } = proto;

  // Nothing is mounted, so there is no work to record against.
  if (proto.categories?.length === 0) {
    return (
      <Stack gap="md" align="flex-start" className="col-start-1 row-start-2 xl:col-start-2 xl:row-start-1">
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
  const serviceActions = catalogue?.actions.filter((action) => !action.replace_action) ?? [];
  const replacementActions = catalogue?.actions.filter((action) => action.replace_action) ?? [];

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
    <Stack gap="md" className="col-start-1 row-start-2 xl:col-start-2 xl:row-start-1" style={{ minWidth: 0 }}>
      <Box>
        <Text component="h2" fw={700} fz={22} c="text.6" lts="var(--tracking-title)" m={0}>
          {catalogue === undefined ? "" : catalogueLabel(catalogue.group_i18n_key, catalogue.group_name, t)}
        </Text>
        <Text fz={14} c="var(--color-text-dim)" mt={6}>
          {COPY.actionsHint}
        </Text>
      </Box>

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

      {serviceActions.length > 0 && (
        <ActionSection title={t("addService.groupService")}>{serviceActions.map(renderAction)}</ActionSection>
      )}
      {replacementActions.length > 0 && (
        <ActionSection title={t("addService.groupReplacement")}>{replacementActions.map(renderAction)}</ActionSection>
      )}
    </Stack>
  );
}

// Maintenance and Replacements are told apart before either is ticked (ADR 0003).
function ActionSection({ title, children }: { title: string; children: ReactElement[] }): ReactElement {
  return (
    <Stack gap={10} mt={6}>
      <Text fz={11} fw={600} tt="uppercase" lts="var(--tracking-label)" c="var(--color-text-dim)">
        {title}
      </Text>
      {children}
    </Stack>
  );
}
