// All wizard state and its transitions in one place, so the step components stay
// presentational and the assembled Service is built in a single readable pass.
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useBikes } from "@/features/bikes/bikes.queries";
import { useCategoryActions, useCreateService } from "@/features/service/service.queries";
import type { Bike } from "@/features/bikes/bikes.types";
import type {
  BikeCategory,
  CatalogueAction,
  CategoryActions,
  CreateServiceInput,
  ServiceActionInput,
  ServiceReplacementInput,
  UploadedAttachment,
} from "@/features/service/service.types";
import {
  actionNote,
  actionsCost,
  NO_ACTIONS,
  sameActionLists,
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

// An id in the URL the user could not have typed reads as no id at all.
function parseId(raw: string | null): number | null {
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
  // Takes a tag or gives it back, by its catalogue name. Nothing is written until the
  // Service is saved — see ADR 0007.
  toggleActionTag: (actionId: number, tagName: string) => void;
  // Whether the draft can be written into the Service. An edited block may be emptied,
  // which removes it; a new one has to carry work.
  canCommit: boolean;
  // What the draft's actions cost so far. A tally of what the user typed into them, never
  // an input of its own — only the visit's total is overridable (ADR 0009).
  draftCost: number;
  // Whether there is a Service to save at all.
  canSave: boolean;
  // Whether the wizard is still waiting on the catalogue its link names, before it can
  // open on the actions step with the linked job ticked (ADR 0030).
  seeding: boolean;
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
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { data: bikes, isLoading: bikesLoading } = useBikes();
  const create = useCreateService();

  // A bike carried in from its detail page is a bike the user has already chosen.
  const bikeFromUrl = parseId(searchParams.get("bike"));
  // A job carried in from a part's row or a Tracked Action: the category it sits in, the
  // action, and the part itself — see ADR 0017 and ADR 0030.
  const categoryFromUrl = parseId(searchParams.get("category"));
  const actionFromUrl = parseId(searchParams.get("action"));
  const componentFromUrl = parseId(searchParams.get("component"));
  const linked =
    bikeFromUrl !== null && categoryFromUrl !== null && actionFromUrl !== null && componentFromUrl !== null;

  const [requestedStep, setStep] = useState<WizardStep>("bike");
  const [chosenBikeId, setChosenBikeId] = useState<number | null>(null);
  const [serviceDate, setServiceDate] = useState<string>(today());
  const [blocks, setBlocks] = useState<CategoryBlock[]>([]);
  // The block the user is working on. Null until they touch one - and while the seed below
  // stands in for it.
  const [ownDraft, setOwnDraft] = useState<DraftBlock | null>(null);
  const [note, setNote] = useState("");
  const [totalCostOverride, setTotalCostOverride] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  // Whether the seed has been used up: committed, or left with back. From then on a param
  // still in the URL never rebuilds a block the user has emptied.
  const [seedSpent, setSeedSpent] = useState(false);

  // The catalogue the link names, fetched by the wizard itself so a link opened cold seeds
  // too. The same key the actions step reads, so the two share one request; let go of
  // once the seed is spent, so a later tag edit does not refetch it on the wizard's behalf.
  const { data: catalogue, isError: catalogueFailed } = useCategoryActions(
    bikeFromUrl,
    linked && !seedSpent ? categoryFromUrl : null,
  );

  // The linked job as a Draft Block, read off the catalogue rather than set from it, so it
  // stands the moment the catalogue arrives. Null while there is nothing to read - and for
  // an action the catalogue no longer carries, which leaves the user at the category step.
  const seed = useMemo(
    () =>
      catalogue === undefined || seedSpent || actionFromUrl === null || componentFromUrl === null
        ? null
        : seedDraft(catalogue, actionFromUrl, componentFromUrl),
    [catalogue, seedSpent, actionFromUrl, componentFromUrl],
  );

  // The seed stands in until the user has a block of their own.
  const draft = ownDraft ?? seed;

  // A link that failed to fetch its catalogue is a link opened cold: category step.
  const seeding = linked && !seedSpent && catalogue === undefined && !catalogueFailed;

  // A question with one answer is not worth asking: an owner of a single bike, or one
  // arriving from a bike's detail, starts at the category step - or, carrying a job in,
  // at the actions step. Derived rather than set, so it settles as soon as the garage
  // arrives instead of after an extra render.
  const bikeStepSkipped = bikeFromUrl !== null || (bikes !== undefined && bikes.length === 1);
  const bikeId = chosenBikeId ?? (bikeStepSkipped ? (bikeFromUrl ?? bikes?.[0]?.id ?? null) : null);
  const step: WizardStep =
    requestedStep !== "bike" ? requestedStep : seed !== null ? "actions" : bikeStepSkipped ? "category" : "bike";

  const draftDirty = (draft?.actions.length ?? 0) > 0;
  // Work is always recorded against a part: an action ticked with none chosen yet holds
  // the block until one is. Nothing says so - the chips it is missing sit right in the card.
  const draftAttributed = draft?.actions.every((action) => action.componentIds.length > 0) ?? true;
  const canCommit = draft !== null && (draftDirty || draft.editingIndex !== null) && draftAttributed;
  const canSave = blocks.length > 0;

  // What the category being worked on costs so far, shown while the user works on it.
  const draftCost = useMemo(() => (draft === null ? 0 : actionsCost(draft.actions)), [draft]);

  const suggestedTotal = useMemo(
    () => blocks.reduce((total, block) => total + actionsCost(block.actions), 0),
    [blocks],
  );
  // The sum is the usual case; an overridden total covers labour and discounts.
  const totalCost = totalCostOverride ?? suggestedTotal;

  // Writes the block being worked on. The first write to the seed makes it the user's own.
  const editDraft = useCallback(
    (write: (current: DraftBlock) => DraftBlock): void => {
      setOwnDraft((current) => {
        const base = current ?? seed;
        return base === null ? current : write(base);
      });
    },
    [seed],
  );

  // Drops the block being worked on, the seed included - it is never rebuilt from the URL.
  const clearDraft = useCallback((): void => {
    setOwnDraft(null);
    setSeedSpent(true);
  }, []);

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
      setOwnDraft(
        existing >= 0
          ? {
              ...blocks[existing],
              actions: [...blocks[existing].actions],
              editingIndex: existing,
            }
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

  const toggleAction = useCallback(
    (action: CatalogueAction): void => {
      editDraft((current) => {
        const picked = current.actions.some((candidate) => candidate.actionId === action.id);
        if (picked) {
          return {
            ...current,
            actions: current.actions.filter((candidate) => candidate.actionId !== action.id),
          };
        }
        return {
          ...current,
          actions: [
            ...current.actions,
            // One candidate is no choice at all, so ticking the action makes it. Two are
            // never guessed between - the user says which brake was bled.
            pickAction(action, action.components.length === 1 ? [action.components[0].id] : []),
          ],
        };
      });
    },
    [editDraft],
  );

  // Reads the selection as it stands rather than taking it from a stale render, so a run
  // of quick taps on several chips all land. The tag is held by its catalogue name; what
  // it will say in the note is decided when the note is composed - see ADR 0007.
  const toggleActionTag = useCallback(
    (actionId: number, tagName: string): void => {
      editDraft((current) => ({
        ...current,
        actions: current.actions.map((action) =>
          action.actionId === actionId
            ? {
                ...action,
                selectedTags: action.selectedTags.includes(tagName)
                  ? action.selectedTags.filter((taken) => taken !== tagName)
                  : [...action.selectedTags, tagName],
              }
            : action,
        ),
      }));
    },
    [editDraft],
  );

  const updateAction = useCallback(
    (actionId: number, patch: Partial<PickedAction>): void => {
      editDraft((current) => ({
        ...current,
        actions: current.actions.map((action) =>
          action.actionId === actionId ? withPrefilledDescriptions({ ...action, ...patch }) : action,
        ),
      }));
    },
    [editDraft],
  );

  // An edited block left with no actions is a block the user removed.
  const commitDraft = useCallback((): void => {
    if (draft === null) return;
    const { editingIndex, ...block } = draft;
    setBlocks((current) => {
      if (editingIndex === null) return [...current, block];
      if (block.actions.length === 0) return current.filter((_, index) => index !== editingIndex);
      return current.map((existing, index) => (index === editingIndex ? block : existing));
    });
    clearDraft();
    setStep("summary");
  }, [draft, clearDraft]);

  const addAnotherCategory = useCallback((): void => setStep("category"), []);

  const editBlock = useCallback(
    (index: number): void => {
      setOwnDraft({
        ...blocks[index],
        actions: [...blocks[index].actions],
        editingIndex: index,
      });
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
    // One rule for both kinds of block: ask only when leaving would actually lose
    // something. An edited block is measured against the block it was opened from, a new
    // one against the empty block it started as, so passing through either and changing
    // nothing costs nothing to leave. Emptying a block is a change like any other - it
    // removes the category from the Service, which is work the user would lose.
    const index = draft.editingIndex;
    // A block opened for editing is measured against the one still sitting in blocks -
    // nothing writes there until commit, so that is the state the user opened. A new block
    // started empty, so its baseline is no actions at all - unless a link seeded it, and
    // then the seed is what the user opened (ADR 0030).
    const baseline = index === null ? (seed?.actions ?? NO_ACTIONS) : blocks[index]?.actions;
    if (baseline !== undefined && sameActionLists(draft.actions, baseline)) return null;
    return index === null ? "discardAction" : "discardEdits";
  }, [step, draft, seed, blocks]);

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
      // A link entered here, and nothing is saved yet: this is the step the user entered
      // on, so back leaves the way they came rather than through a category step they
      // never saw (ADR 0030).
      if (linked && !editing && blocks.length === 0) {
        navigate(-1);
        return;
      }
      clearDraft();
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
  }, [step, draft, linked, blocks.length, bikeStepSkipped, clearDraft, navigate]);

  const save = useCallback((): void => {
    if (bikeId === null) return;
    create.mutate(
      {
        bike_id: bikeId,
        service_date: toIsoDate(serviceDate),
        total_cost: totalCost,
        note: note.trim() === "" ? undefined : note.trim(),
        attachment: attachments.length > 0 ? attachments : undefined,
        ...splitActions(blocks, t),
      },
      // Back where the work was started from: the bike whose build has just changed when
      // the wizard was entered from one, otherwise the list the new service tops.
      {
        onSuccess: () =>
          navigate(bikeFromUrl === null ? "/service" : `/bikes/${String(bikeFromUrl)}`, { replace: true }),
      },
    );
  }, [bikeId, bikeFromUrl, serviceDate, totalCost, note, attachments, blocks, create, navigate, t]);

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
    toggleActionTag,
    canCommit,
    draftCost,
    canSave,
    seeding,
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

// A Replacement describes each part going on, prefilled from the one it replaces. The map
// is rebuilt against the picked parts on every change, which is the whole invariant: a part
// just picked arrives with the name of the one it replaces, and a part unpicked takes its
// name with it rather than lingering as a change the user cannot see.
// The job a link named, as a Draft Block picked out of its category's catalogue. Null when
// the catalogue no longer carries the action - it has moved on since the link was built,
// so the user picks for themselves.
function seedDraft(category: CategoryActions, actionId: number, componentId: number): DraftBlock | null {
  const action = category.actions.find((candidate) => candidate.id === actionId);
  if (action === undefined) return null;

  return {
    categoryId: category.group_id,
    categoryName: category.group_name,
    categoryI18nKey: category.group_i18n_key,
    actions: [pickAction(action, action.components.some((part) => part.id === componentId) ? [componentId] : [])],
    editingIndex: null,
  };
}

// One catalogue Action as the draft holds it, performed on the given parts. Run through
// the same writer an edit uses, so the part going on is described from the part it
// replaces here too rather than in a second place.
function pickAction(action: CatalogueAction, componentIds: number[]): PickedAction {
  return withPrefilledDescriptions({
    actionId: action.id,
    actionName: action.action_name,
    actionI18nKey: action.action_i18n_key,
    replaceAction: action.replace_action,
    tags: action.tags,
    // Nothing is claimed on the user's behalf: what was done is what they write.
    customNote: "",
    selectedTags: [],
    candidates: action.components,
    componentIds,
    newDescriptions: {},
    partialCost: null,
  });
}

function withPrefilledDescriptions(action: PickedAction): PickedAction {
  if (!action.replaceAction) {
    return Object.keys(action.newDescriptions).length === 0 ? action : { ...action, newDescriptions: {} };
  }

  const next: Record<number, string> = {};
  for (const id of action.componentIds) {
    const replaced = action.candidates.find((component) => component.id === id);
    // An emptied field stays empty - only a part with no entry at all is prefilled.
    next[id] = action.newDescriptions[id] ?? replaced?.component_desc ?? "";
  }
  return { ...action, newDescriptions: next };
}

// Flattens every block into the two lists the API takes: ordinary work, and the
// replacements that end one Mounted Component and begin another.
function splitActions(
  blocks: CategoryBlock[],
  translate: (key: string) => string,
): Pick<CreateServiceInput, "actions_done" | "actions_replaced"> {
  const actionsDone: ServiceActionInput[] = [];
  const replacements: ServiceReplacementInput[] = [];

  for (const block of blocks) {
    for (const action of block.actions) {
      // Where the tags become prose: what the user wrote, then what they took. From here
      // on it is one string, indistinguishable from a note typed in full - see ADR 0007.
      const note = actionNote(action, translate);

      const replaced = action.replaceAction
        ? action.candidates.filter((component) => action.componentIds.includes(component.id))
        : [];

      if (replaced.length === 0) {
        // A Replacement nobody attributed to a part creates no new component, so the
        // description of the part going on has only this note to live in.
        actionsDone.push({
          action_id: action.actionId,
          part_replaced: action.replaceAction,
          mounted_components_involved: action.componentIds,
          ...(action.partialCost === null ? {} : { partial_cost: action.partialCost }),
          ...(note === "" ? {} : { description: note }),
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
            action.newDescriptions[component.id]?.trim() || (component.component_desc ?? component.component_type),
          action_id: action.actionId,
          ...(note === "" ? {} : { note }),
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
