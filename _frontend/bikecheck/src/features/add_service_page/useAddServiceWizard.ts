// All wizard state and its transitions in one place, so the step components stay
// presentational and the assembled Service is built in a single readable pass.
import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useBikes } from "@/features/bikes/bikes.queries";
import { useCreateService } from "@/features/service/service.queries";
import type { Bike } from "@/features/bikes/bikes.types";
import type {
  BikeCategory,
  CatalogueAction,
  CreateServiceInput,
  ServiceActionInput,
  ServiceReplacementInput,
  UploadedAttachment,
} from "@/features/service/service.types";
import { preselectedComponents, today, type CategoryBlock, type PickedAction } from "./serviceWizard.types";

export type WizardStep = "bike" | "category" | "actions" | "review";

// A day, sent as the instant the backend reads back as that day.
function toIsoDate(day: string): string {
  return new Date(`${day}T00:00:00.000Z`).toISOString();
}

// A bike id in the URL the user could not have typed reads as no bike at all.
function parseBikeId(raw: string | null): number | null {
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export interface AddServiceWizard {
  step: WizardStep;
  bikes: Bike[] | undefined;
  bikesLoading: boolean;
  bikeId: number | null;
  serviceDate: string;
  setServiceDate: (day: string) => void;
  blocks: CategoryBlock[];
  activeBlock: CategoryBlock | undefined;
  activeBlockIndex: number;
  note: string;
  setNote: (note: string) => void;
  totalCost: number;
  // Null hands the total back to the sum of the per-action prices.
  setTotalCost: (value: number | null) => void;
  attachments: UploadedAttachment[];
  addAttachment: (attachment: UploadedAttachment) => void;
  removeAttachment: (url: string) => void;
  chooseBike: (bikeId: number) => void;
  chooseCategory: (category: BikeCategory) => void;
  toggleAction: (action: CatalogueAction) => void;
  updateAction: (actionId: number, patch: Partial<PickedAction>) => void;
  addAnotherCategory: () => void;
  editBlock: (index: number) => void;
  goToReview: () => void;
  back: () => void;
  save: () => void;
  saving: boolean;
  saveFailed: boolean;
}

export function useAddServiceWizard(): AddServiceWizard {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: bikes, isLoading: bikesLoading } = useBikes();
  const create = useCreateService();

  // A bike carried in from its detail page is a bike the user has already chosen.
  const bikeFromUrl = parseBikeId(searchParams.get("bike"));

  const [requestedStep, setStep] = useState<WizardStep>("bike");
  const [chosenBikeId, setChosenBikeId] = useState<number | null>(null);
  const [serviceDate, setServiceDate] = useState<string>(today());
  const [blocks, setBlocks] = useState<CategoryBlock[]>([]);
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [note, setNote] = useState("");
  const [totalCostOverride, setTotalCostOverride] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);

  // A question with one answer is not worth asking: an owner of a single bike, or one
  // arriving from a bike's detail, starts at the category step. Derived rather than set,
  // so it settles as soon as the garage arrives instead of after an extra render.
  const bikeStepSkipped = bikeFromUrl !== null || (bikes !== undefined && bikes.length === 1);
  const bikeId = chosenBikeId ?? (bikeStepSkipped ? (bikeFromUrl ?? bikes?.[0]?.id ?? null) : null);
  const step: WizardStep = requestedStep === "bike" && bikeStepSkipped ? "category" : requestedStep;

  const activeBlock = blocks[activeBlockIndex];

  const suggestedTotal = useMemo(
    () =>
      blocks.reduce(
        (total, block) => total + block.actions.reduce((sum, action) => sum + (action.partialCost ?? 0), 0),
        0,
      ),
    [blocks],
  );
  // The sum is the usual case; an overridden total covers labour and discounts.
  const totalCost = totalCostOverride ?? suggestedTotal;

  const chooseBike = useCallback((chosen: number): void => {
    setChosenBikeId(chosen);
    setStep("category");
  }, []);

  // Picking a category the Service already covers returns to that block rather than
  // opening a second one for the same parts.
  const chooseCategory = useCallback(
    (category: BikeCategory): void => {
      const existing = blocks.findIndex((block) => block.categoryId === category.group_id);
      if (existing >= 0) {
        setActiveBlockIndex(existing);
      } else {
        setActiveBlockIndex(blocks.length);
        setBlocks([
          ...blocks,
          {
            categoryId: category.group_id,
            categoryName: category.group_name,
            categoryI18nKey: category.group_i18n_key,
            actions: [],
          },
        ]);
      }
      setStep("actions");
    },
    [blocks],
  );

  const toggleAction = useCallback(
    (action: CatalogueAction): void => {
      setBlocks((current) =>
        current.map((block, index) => {
          if (index !== activeBlockIndex) return block;
          const picked = block.actions.some((candidate) => candidate.actionId === action.id);
          if (picked) {
            return { ...block, actions: block.actions.filter((candidate) => candidate.actionId !== action.id) };
          }
          const componentIds = preselectedComponents(action.components);
          const replaced = action.components.find((component) => component.id === componentIds[0]);
          return {
            ...block,
            actions: [
              ...block.actions,
              {
                actionId: action.id,
                actionName: action.action_name,
                actionI18nKey: action.action_i18n_key,
                replaceAction: action.replace_action,
                tags: action.tags,
                candidates: action.components,
                componentIds,
                // Like for like takes no typing; an upgrade takes a little.
                newDescription: action.replace_action ? (replaced?.component_desc ?? "") : "",
                partialCost: null,
              },
            ],
          };
        }),
      );
    },
    [activeBlockIndex],
  );

  const updateAction = useCallback(
    (actionId: number, patch: Partial<PickedAction>): void => {
      setBlocks((current) =>
        current.map((block, index) =>
          index === activeBlockIndex
            ? {
                ...block,
                actions: block.actions.map((action) =>
                  action.actionId === actionId ? withPrefilledDescription({ ...action, ...patch }) : action,
                ),
              }
            : block,
        ),
      );
    },
    [activeBlockIndex],
  );

  const addAnotherCategory = useCallback((): void => setStep("category"), []);
  const goToReview = useCallback((): void => setStep("review"), []);

  const editBlock = useCallback((index: number): void => {
    setActiveBlockIndex(index);
    setStep("actions");
  }, []);

  const addAttachment = useCallback((attachment: UploadedAttachment): void => {
    setAttachments((current) => [...current, attachment]);
  }, []);

  const removeAttachment = useCallback((url: string): void => {
    setAttachments((current) => current.filter((attachment) => attachment.url !== url));
  }, []);

  // Back walks the wizard, and only leaves it from the step the user entered on.
  const back = useCallback((): void => {
    if (step === "review") {
      setStep("actions");
      return;
    }
    if (step === "actions") {
      setStep("category");
      return;
    }
    if (step === "category" && !bikeStepSkipped) {
      setStep("bike");
      return;
    }
    navigate(-1);
  }, [step, bikeStepSkipped, navigate]);

  const save = useCallback((): void => {
    if (bikeId === null) return;
    create.mutate(
      {
        bike_id: bikeId,
        service_date: toIsoDate(serviceDate),
        total_cost: totalCost,
        note: note.trim() === "" ? undefined : note.trim(),
        attachment: attachments.length > 0 ? attachments : undefined,
        ...splitActions(blocks),
      },
      // The user is dropped back where the new service now sits at the top.
      { onSuccess: () => navigate("/service", { replace: true }) },
    );
  }, [bikeId, serviceDate, totalCost, note, attachments, blocks, create, navigate]);

  return {
    step,
    bikes,
    bikesLoading,
    bikeId,
    serviceDate,
    setServiceDate,
    blocks,
    activeBlock,
    activeBlockIndex,
    note,
    setNote,
    totalCost,
    setTotalCost: setTotalCostOverride,
    attachments,
    addAttachment,
    removeAttachment,
    chooseBike,
    chooseCategory,
    toggleAction,
    updateAction,
    addAnotherCategory,
    editBlock,
    goToReview,
    back,
    save,
    saving: create.isPending,
    saveFailed: create.isError,
  };
}

// A Replacement describes the part going on, prefilled from the one coming off. The
// prefill waits for a part to be picked, because with two candidates none is guessed.
function withPrefilledDescription(action: PickedAction): PickedAction {
  if (!action.replaceAction || action.newDescription.trim() !== "") {
    return action;
  }
  const replaced = action.candidates.find((component) => component.id === action.componentIds[0]);
  return { ...action, newDescription: replaced?.component_desc ?? "" };
}

// Flattens every block into the two lists the API takes: ordinary work, and the
// replacements that end one Mounted Component and begin another.
function splitActions(blocks: CategoryBlock[]): Pick<CreateServiceInput, "actions_done" | "actions_replaced"> {
  const actionsDone: ServiceActionInput[] = [];
  const replacements: ServiceReplacementInput[] = [];

  for (const block of blocks) {
    for (const action of block.actions) {
      const replaced = action.replaceAction
        ? action.candidates.filter((component) => action.componentIds.includes(component.id))
        : [];

      if (replaced.length === 0) {
        actionsDone.push({
          action_id: action.actionId,
          part_replaced: action.replaceAction,
          mounted_components_involved: action.componentIds,
          ...(action.partialCost === null ? {} : { partial_cost: action.partialCost }),
          ...(action.newDescription.trim() === "" ? {} : { description: action.newDescription.trim() }),
        });
        continue;
      }

      // Two pads replaced in one action are two new parts, each with its own history.
      // The price covers the action, so the first of them carries it rather than each
      // part being charged the same figure over again.
      replaced.forEach((component, index) => {
        replacements.push({
          old_component_mounted_id: component.id,
          component_type_id: component.component_type_id,
          new_component_desc:
            action.newDescription.trim() === ""
              ? (component.component_desc ?? component.component_type)
              : action.newDescription.trim(),
          action_id: action.actionId,
          ...(action.partialCost === null || index > 0 ? {} : { partial_cost: action.partialCost }),
        });
      });
    }
  }

  return {
    actions_done: actionsDone,
    ...(replacements.length > 0 ? { actions_replaced: replacements } : {}),
  };
}
