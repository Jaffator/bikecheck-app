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
import {
  toggleSegment,
  preselectedComponents,
  today,
  type CategoryBlock,
  type DraftBlock,
  type PickedAction,
} from "./serviceWizard.types";

export type WizardStep = "bike" | "category" | "actions" | "summary";

// What has to be confirmed before back is allowed to throw work away. Each names a
// different loss: a draft category, the edits to a saved one, or the whole Service.
// Null means back costs the user nothing and can just happen.
export type BackPrompt = "discardAction" | "discardEdits" | "discardService" | null;

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
  draft: DraftBlock | null;
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
  // A tag chip writes its own text into the action's note, or takes it back out when the
  // note already says it — see ADR 0005.
  toggleActionNote: (actionId: number, text: string) => void;
  // Whether the draft can be written into the Service. An edited block may be emptied,
  // which removes it; a new one has to carry work.
  canCommit: boolean;
  // Whether there is a Service to save at all.
  canSave: boolean;
  // Writes the draft into the Service and lands on the Summary.
  commitDraft: () => void;
  addAnotherCategory: () => void;
  editBlock: (index: number) => void;
  backPrompt: () => BackPrompt;
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
  const [draft, setDraft] = useState<DraftBlock | null>(null);
  const [note, setNote] = useState("");
  const [totalCostOverride, setTotalCostOverride] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);

  // A question with one answer is not worth asking: an owner of a single bike, or one
  // arriving from a bike's detail, starts at the category step. Derived rather than set,
  // so it settles as soon as the garage arrives instead of after an extra render.
  const bikeStepSkipped = bikeFromUrl !== null || (bikes !== undefined && bikes.length === 1);
  const bikeId = chosenBikeId ?? (bikeStepSkipped ? (bikeFromUrl ?? bikes?.[0]?.id ?? null) : null);
  const step: WizardStep = requestedStep === "bike" && bikeStepSkipped ? "category" : requestedStep;

  const draftDirty = (draft?.actions.length ?? 0) > 0;
  const canCommit = draft !== null && (draftDirty || draft.editingIndex !== null);
  const canSave = blocks.length > 0;

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

  // Picking a category the Service already covers reopens that block rather than opening
  // a second one for the same parts. Nothing reaches the Summary until the draft is
  // confirmed, so a category picked by mistake leaves no trace — see ADR 0006.
  const chooseCategory = useCallback(
    (category: BikeCategory): void => {
      const existing = blocks.findIndex((block) => block.categoryId === category.group_id);
      setDraft(
        existing >= 0
          ? { ...blocks[existing], actions: [...blocks[existing].actions], editingIndex: existing }
          : {
              categoryId: category.group_id,
              categoryName: category.group_name,
              categoryI18nKey: category.group_i18n_key,
              actions: [],
              editingIndex: null,
            },
      );
      setStep("actions");
    },
    [blocks],
  );

  const toggleAction = useCallback((action: CatalogueAction): void => {
    setDraft((current) => {
      if (current === null) return current;
      const picked = current.actions.some((candidate) => candidate.actionId === action.id);
      if (picked) {
        return { ...current, actions: current.actions.filter((candidate) => candidate.actionId !== action.id) };
      }
      const componentIds = preselectedComponents(action.components);
      const replaced = action.components.find((component) => component.id === componentIds[0]);
      return {
        ...current,
        actions: [
          ...current.actions,
          {
            actionId: action.id,
            actionName: action.action_name,
            actionI18nKey: action.action_i18n_key,
            replaceAction: action.replace_action,
            tags: action.tags,
            // Nothing is claimed on the user's behalf: what was done is what they write.
            note: "",
            candidates: action.components,
            componentIds,
            // Like for like takes no typing; an upgrade takes a little.
            newDescription: action.replace_action ? (replaced?.component_desc ?? "") : "",
            partialCost: null,
          },
        ],
      };
    });
  }, []);

  // Reads the note as it stands rather than taking it from a stale render, so a run of
  // quick taps on several chips all land - and so each tap sees whether the note already
  // says its text, which is what decides between writing and unwriting it.
  const toggleActionNote = useCallback((actionId: number, text: string): void => {
    setDraft((current) =>
      current === null
        ? current
        : {
            ...current,
            actions: current.actions.map((action) =>
              action.actionId === actionId ? { ...action, note: toggleSegment(action.note, text) } : action,
            ),
          },
    );
  }, []);

  const updateAction = useCallback((actionId: number, patch: Partial<PickedAction>): void => {
    setDraft((current) =>
      current === null
        ? current
        : {
            ...current,
            actions: current.actions.map((action) =>
              action.actionId === actionId ? withPrefilledDescription({ ...action, ...patch }) : action,
            ),
          },
    );
  }, []);

  // An edited block left with no actions is a block the user removed.
  const commitDraft = useCallback((): void => {
    if (draft === null) return;
    const { editingIndex, ...block } = draft;
    setBlocks((current) => {
      if (editingIndex === null) return [...current, block];
      if (block.actions.length === 0) return current.filter((_, index) => index !== editingIndex);
      return current.map((existing, index) => (index === editingIndex ? block : existing));
    });
    setDraft(null);
    setStep("summary");
  }, [draft]);

  const addAnotherCategory = useCallback((): void => setStep("category"), []);

  const editBlock = useCallback(
    (index: number): void => {
      setDraft({ ...blocks[index], actions: [...blocks[index].actions], editingIndex: index });
      setStep("actions");
    },
    [blocks],
  );

  const addAttachment = useCallback((attachment: UploadedAttachment): void => {
    setAttachments((current) => [...current, attachment]);
  }, []);

  const removeAttachment = useCallback((url: string): void => {
    setAttachments((current) => current.filter((attachment) => attachment.url !== url));
  }, []);

  // What back would cost from here, asked before it happens rather than regretted after.
  // The Summary always asks: reaching it took work, and the date, note, total and
  // attachments it holds outlive the last block being removed.
  const backPrompt = useCallback((): BackPrompt => {
    if (step === "summary") return "discardService";
    if (step !== "actions" || draft === null) return null;
    // Any pass through an edited block may have changed it, emptying it included.
    if (draft.editingIndex !== null) return "discardEdits";
    return draftDirty ? "discardAction" : null;
  }, [step, draft, draftDirty]);

  // Back walks the wizard rather than the browser history, and only leaves it from the
  // step the user entered on. The Summary has no way back into the wizard, so leaving it
  // leaves the wizard — see ADR 0006.
  const back = useCallback((): void => {
    if (step === "summary") {
      navigate("/service");
      return;
    }
    if (step === "actions") {
      const editing = draft !== null && draft.editingIndex !== null;
      setDraft(null);
      setStep(editing || blocks.length > 0 ? "summary" : "category");
      return;
    }
    if (step === "category") {
      if (blocks.length > 0) {
        setStep("summary");
        return;
      }
      if (!bikeStepSkipped) {
        setStep("bike");
        return;
      }
    }
    navigate(-1);
  }, [step, draft, blocks.length, bikeStepSkipped, navigate]);

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
    draft,
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
    toggleActionNote,
    canCommit,
    canSave,
    commitDraft,
    addAnotherCategory,
    editBlock,
    backPrompt,
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
      // What the user says was actually done, in their own words.
      const actionNote = action.note.trim();

      const replaced = action.replaceAction
        ? action.candidates.filter((component) => action.componentIds.includes(component.id))
        : [];

      if (replaced.length === 0) {
        // A Replacement nobody attributed to a part creates no new component, so the
        // description of the part going on has only this note to live in.
        const description = [actionNote, action.replaceAction ? action.newDescription.trim() : ""]
          .filter((part) => part !== "")
          .join(" — ");

        actionsDone.push({
          action_id: action.actionId,
          part_replaced: action.replaceAction,
          mounted_components_involved: action.componentIds,
          ...(action.partialCost === null ? {} : { partial_cost: action.partialCost }),
          ...(description === "" ? {} : { description }),
        });
        continue;
      }

      // Two pads replaced in one action are two new parts, each with its own history.
      // The price covers the action, so the first of them carries it rather than each
      // part being charged the same figure over again. The note describes the work, so
      // every part carries it.
      replaced.forEach((component, index) => {
        replacements.push({
          old_component_mounted_id: component.id,
          component_type_id: component.component_type_id,
          new_component_desc:
            action.newDescription.trim() === ""
              ? (component.component_desc ?? component.component_type)
              : action.newDescription.trim(),
          action_id: action.actionId,
          ...(actionNote === "" ? {} : { note: actionNote }),
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
