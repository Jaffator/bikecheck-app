// PROTOTYPE (proto/desktop-wizards): desktop service state with no Draft Block - a tick is in the Service at once.
// Save is a stub: nothing is sent, so a Replacement clicked through here ends no real part.
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useBikes } from "@/features/bikes/bikes.queries";
import type { ListedBike } from "@/features/bikes/bikes.types";
import { useBikeCategories, useCategoryActions } from "@/features/service/service.queries";
import type { BikeCategory, CatalogueAction, CategoryActions, ServicePlace } from "@/features/service/service.types";
import { actionsCost, today, type CategoryBlock, type PickedAction } from "../serviceWizard.types";
import { pickAction, withPrefilledDescriptions } from "../useAddServiceWizard";

const NO_BLOCKS: CategoryBlock[] = [];

function parseId(raw: string | null): number | null {
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

// An emptied block is a category nothing was done in, so it leaves with its last action.
function withoutAction(blocks: CategoryBlock[], actionId: number): CategoryBlock[] {
  return blocks
    .map((block) => ({ ...block, actions: block.actions.filter((action) => action.actionId !== actionId) }))
    .filter((block) => block.actions.length > 0);
}

function mapAction(
  blocks: CategoryBlock[],
  actionId: number,
  write: (action: PickedAction) => PickedAction,
): CategoryBlock[] {
  return blocks.map((block) => ({
    ...block,
    actions: block.actions.map((action) => (action.actionId === actionId ? write(action) : action)),
  }));
}

export interface ServiceDesktopPrototypeState {
  bikes: ListedBike[] | undefined;
  bikeId: number | null;
  // Parts belong to a bike, so another bike starts the Service over.
  changeBike: (bikeId: number) => void;
  categories: BikeCategory[] | undefined;
  categoriesLoading: boolean;
  categoriesFailed: boolean;
  categoryId: number | null;
  chooseCategory: (categoryId: number) => void;
  catalogue: CategoryActions | undefined;
  catalogueLoading: boolean;
  catalogueFailed: boolean;
  openActionId: number | null;
  setOpenActionId: (actionId: number | null) => void;
  blocks: CategoryBlock[];
  toggleAction: (action: CatalogueAction) => void;
  updateAction: (actionId: number, patch: Partial<PickedAction>) => void;
  toggleActionTag: (actionId: number, tagName: string) => void;
  removeAction: (actionId: number) => void;
  // Jumps the middle column to one recorded action.
  showAction: (categoryId: number, actionId: number) => void;
  serviceDate: string;
  setServiceDate: (day: string) => void;
  place: ServicePlace;
  setPlace: (place: ServicePlace) => void;
  shopName: string;
  setShopName: (name: string) => void;
  note: string;
  setNote: (note: string) => void;
  files: File[];
  addFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
  totalCost: number;
  // Null hands the total back to the sum (ADR 0009).
  setTotalCost: (value: number | null) => void;
  pickedCount: number;
  // An action ticked with no part chosen holds Save until one is.
  unattributed: boolean;
  canSave: boolean;
  saved: boolean;
  // What the last Save recorded, kept past a reset so its confirmation can still read it.
  lastSaved: SavedSummary | null;
  save: () => void;
  reset: () => void;
  // The bike the wizard was entered from, which is where a finished Service returns to.
  entryBikeId: number | null;
}

export interface SavedSummary {
  actionCount: number;
  totalCost: number;
}

export function useServiceDesktopPrototype(): ServiceDesktopPrototypeState {
  const [searchParams] = useSearchParams();
  const { data: bikes } = useBikes();

  const bikeFromUrl = parseId(searchParams.get("bike"));
  const categoryFromUrl = parseId(searchParams.get("category"));
  const actionFromUrl = parseId(searchParams.get("action"));
  const componentFromUrl = parseId(searchParams.get("component"));

  const [chosenBikeId, setChosenBikeId] = useState<number | null>(null);
  const [chosenCategoryId, setChosenCategoryId] = useState<number | null>(null);
  // Once the user owns the blocks, or changed bike, the link stops speaking.
  const [linkSpent, setLinkSpent] = useState(false);
  const [ownBlocks, setOwnBlocks] = useState<CategoryBlock[] | null>(null);
  // Undefined until the user opens or closes a card themselves.
  const [ownOpenActionId, setOwnOpenActionId] = useState<number | null | undefined>(undefined);
  const [serviceDate, setServiceDate] = useState<string>(today());
  const [place, setPlace] = useState<ServicePlace>("HOME");
  const [shopName, setShopName] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [totalCostOverride, setTotalCostOverride] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [lastSaved, setLastSaved] = useState<SavedSummary | null>(null);

  // No bike step on desktop: the link's bike, else the first in the garage, changed in the panel.
  const bikeId = chosenBikeId ?? bikeFromUrl ?? bikes?.[0]?.id ?? null;
  const categoriesQuery = useBikeCategories(bikeId);
  const categories = categoriesQuery.data;
  const categoryId =
    chosenCategoryId ?? (linkSpent ? null : categoryFromUrl) ?? categories?.[0]?.group_id ?? null;
  const catalogueQuery = useCategoryActions(bikeId, categoryId);
  const catalogue = catalogueQuery.data;

  // The linked job (ADR 0030), read off the catalogue so it stands the moment that arrives.
  const seedBlocks = useMemo((): CategoryBlock[] => {
    if (linkSpent || catalogue === undefined || actionFromUrl === null || componentFromUrl === null) return NO_BLOCKS;
    if (catalogue.group_id !== categoryFromUrl) return NO_BLOCKS;
    const action = catalogue.actions.find((candidate) => candidate.id === actionFromUrl);
    if (action === undefined) return NO_BLOCKS;
    const parts = action.components.some((part) => part.id === componentFromUrl) ? [componentFromUrl] : [];
    return [
      {
        categoryId: catalogue.group_id,
        categoryName: catalogue.group_name,
        categoryI18nKey: catalogue.group_i18n_key,
        actions: [pickAction(action, parts)],
      },
    ];
  }, [linkSpent, catalogue, categoryFromUrl, actionFromUrl, componentFromUrl]);

  const blocks = ownBlocks ?? seedBlocks;
  const openActionId = ownOpenActionId !== undefined ? ownOpenActionId : (seedBlocks[0]?.actions[0]?.actionId ?? null);

  const writeBlocks = useCallback(
    (write: (current: CategoryBlock[]) => CategoryBlock[]): void => {
      setOwnBlocks((current) => write(current ?? seedBlocks));
    },
    [seedBlocks],
  );

  const changeBike = useCallback((nextBikeId: number): void => {
    setChosenBikeId(nextBikeId);
    setChosenCategoryId(null);
    setLinkSpent(true);
    setOwnBlocks([]);
    setOwnOpenActionId(null);
    setTotalCostOverride(null);
  }, []);

  const chooseCategory = useCallback(
    (nextCategoryId: number): void => {
      // The seed is read off the active catalogue, so it is kept before that changes.
      writeBlocks((current) => current);
      setChosenCategoryId(nextCategoryId);
      setOwnOpenActionId(null);
    },
    [writeBlocks],
  );

  const toggleAction = useCallback(
    (action: CatalogueAction): void => {
      if (catalogue === undefined) return;
      writeBlocks((current) => {
        const block = current.find((candidate) => candidate.categoryId === catalogue.group_id);
        if (block?.actions.some((picked) => picked.actionId === action.id)) return withoutAction(current, action.id);

        // One candidate is no choice; two are never guessed between.
        const picked = pickAction(action, action.components.length === 1 ? [action.components[0].id] : []);
        if (block === undefined) {
          return [
            ...current,
            {
              categoryId: catalogue.group_id,
              categoryName: catalogue.group_name,
              categoryI18nKey: catalogue.group_i18n_key,
              actions: [picked],
            },
          ];
        }
        return current.map((candidate) =>
          candidate === block ? { ...candidate, actions: [...candidate.actions, picked] } : candidate,
        );
      });
    },
    [catalogue, writeBlocks],
  );

  const updateAction = useCallback(
    (actionId: number, patch: Partial<PickedAction>): void => {
      writeBlocks((current) =>
        mapAction(current, actionId, (action) => withPrefilledDescriptions({ ...action, ...patch })),
      );
    },
    [writeBlocks],
  );

  const toggleActionTag = useCallback(
    (actionId: number, tagName: string): void => {
      writeBlocks((current) =>
        mapAction(current, actionId, (action) => ({
          ...action,
          selectedTags: action.selectedTags.includes(tagName)
            ? action.selectedTags.filter((taken) => taken !== tagName)
            : [...action.selectedTags, tagName],
        })),
      );
    },
    [writeBlocks],
  );

  const removeAction = useCallback(
    (actionId: number): void => {
      writeBlocks((current) => withoutAction(current, actionId));
    },
    [writeBlocks],
  );

  const showAction = useCallback(
    (nextCategoryId: number, actionId: number): void => {
      writeBlocks((current) => current);
      setChosenCategoryId(nextCategoryId);
      setOwnOpenActionId(actionId);
    },
    [writeBlocks],
  );

  const addFiles = useCallback((added: File[]): void => {
    setFiles((current) => [...current, ...added]);
  }, []);

  const removeFile = useCallback((index: number): void => {
    setFiles((current) => current.filter((_, position) => position !== index));
  }, []);

  const picked = blocks.flatMap((block) => block.actions);
  const unattributed = picked.some((action) => action.componentIds.length === 0);
  const suggestedTotal = blocks.reduce((total, block) => total + actionsCost(block.actions), 0);
  const totalCost = totalCostOverride ?? suggestedTotal;

  // The stub: nothing is sent, the Service is only counted for its confirmation.
  function save(): void {
    setLastSaved({ actionCount: picked.length, totalCost });
    setSaved(true);
  }

  const reset = useCallback((): void => {
    setSaved(false);
    setLinkSpent(true);
    setOwnBlocks([]);
    setOwnOpenActionId(null);
    setNote("");
    setFiles([]);
    setTotalCostOverride(null);
    setServiceDate(today());
  }, []);

  return {
    bikes,
    bikeId,
    changeBike,
    categories,
    categoriesLoading: categoriesQuery.isLoading,
    categoriesFailed: categoriesQuery.isError,
    categoryId,
    chooseCategory,
    catalogue,
    catalogueLoading: catalogueQuery.isLoading,
    catalogueFailed: catalogueQuery.isError,
    openActionId,
    setOpenActionId: setOwnOpenActionId,
    blocks,
    toggleAction,
    updateAction,
    toggleActionTag,
    removeAction,
    showAction,
    serviceDate,
    setServiceDate,
    place,
    setPlace,
    shopName,
    setShopName,
    note,
    setNote,
    files,
    addFiles,
    removeFile,
    totalCost,
    setTotalCost: setTotalCostOverride,
    pickedCount: picked.length,
    unattributed,
    canSave: picked.length > 0 && !unattributed,
    saved,
    lastSaved,
    save,
    reset,
    entryBikeId: bikeFromUrl,
  };
}
