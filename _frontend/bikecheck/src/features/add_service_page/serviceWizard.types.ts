// What the wizard holds while it is open. None of it is a database shape: a category
// block exists in the wizard only, and is flattened into one Service on save (ADR 0002).
import type { ActionTag, MountedComponent } from "@/features/service/service.types";

// One Action the user ticked inside a category block.
export interface PickedAction {
  actionId: number;
  actionName: string;
  actionI18nKey: string | null;
  // A Replacement swaps a part out; it is not an edit of the existing one (ADR 0003).
  replaceAction: boolean;
  // What the Action covers, from the catalogue.
  tags: ActionTag[];
  // The ones the user says were actually done. Tags carry no id of their own, and a tag
  // name is unique within an action, so the name is the handle — see ADR 0005.
  selectedTags: string[];
  // The parts on this bike the Action could have been performed on.
  candidates: MountedComponent[];
  // The ones it was performed on. Empty warns rather than blocks: work the user cannot
  // attribute precisely is still work that happened.
  componentIds: number[];
  // The part going on, for a Replacement. Prefilled from the one coming off.
  newDescription: string;
  // Null means no figure was recorded, which is not the same as free.
  partialCost: number | null;
}

// One visit to one Component Category, inside one Service.
export interface CategoryBlock {
  categoryId: number;
  categoryName: string;
  categoryI18nKey: string | null;
  actions: PickedAction[];
}

// The block being worked on, which reaches the Summary only when the user confirms it.
// A null index means a category being added; a number means the block it will replace.
export interface DraftBlock extends CategoryBlock {
  editingIndex: number | null;
}

// The one candidate a single-part Action is preselected with; two candidates are never
// guessed between, so the user says which brake was bled.
export function preselectedComponents(candidates: MountedComponent[]): number[] {
  return candidates.length === 1 ? [candidates[0].id] : [];
}

// The wizard speaks days, which is also what a service date is.
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
