// What the wizard holds while it is open. None of it is a database shape: a category
// block exists in the wizard only, and is flattened into one Service on save (ADR 0002).
import { catalogueLabel } from "@/features/service/serviceLabels";
import type { ActionTag, MountedComponent } from "@/features/service/service.types";

// One Action the user ticked inside a category block.
export interface PickedAction {
  actionId: number;
  actionName: string;
  actionI18nKey: string | null;
  // A Replacement swaps a part out; it is not an edit of the existing one (ADR 0003).
  replaceAction: boolean;
  // What the Action covers, from the catalogue, plus any the user added themselves. Chips
  // the user taps; a tap changes the selection below and nothing else — see ADR 0007.
  tags: ActionTag[];
  // What the user typed, and only that. Nothing writes here on their behalf.
  customNote: string;
  // The tags taken, by catalogue name rather than display label: the label is resolved
  // when the note is composed, so it is written in the language of the moment it is
  // saved and never translated again — see ADR 0007.
  selectedTags: string[];
  // The parts on this bike the Action could have been performed on.
  candidates: MountedComponent[];
  // The ones it was performed on. Empty warns rather than blocks: work the user cannot
  // attribute precisely is still work that happened.
  componentIds: number[];
  // The part going on, for a Replacement - one per part coming off, keyed by its mounted
  // id, because two pads replaced in one action are two new parts. Prefilled from the part
  // it replaces and held only for the parts currently picked, so it never describes a part
  // the user has since unticked.
  newDescriptions: Record<number, string>;
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

// What the composed note joins its parts with, and therefore what a segment is.
const NOTE_SEPARATOR = " · ";

// The note read as segments. Nothing marks a segment as tag-written: once composed, the
// note is prose, and what a chip contributed is indistinguishable from what was typed.
function noteSegments(note: string): string[] {
  return note
    .split(NOTE_SEPARATOR)
    .map((segment) => segment.trim())
    .filter((segment) => segment !== "");
}

// What a set of Actions costs: the prices typed into them, and nothing else. One rule,
// whether it is asked about one category being worked on or every block in the Service.
export function actionsCost(actions: PickedAction[]): number {
  return actions.reduce((sum, action) => sum + (action.partialCost ?? 0), 0);
}

// Whether the text already says this, as an exact segment. What keeps a tag the user
// also wrote out by hand from being said twice.
export function hasSegment(note: string, text: string): boolean {
  return noteSegments(note).includes(text.trim());
}

// The Action Note as it will be stored: what the user wrote, then the tags they took, in
// catalogue order. A tag the custom note already names is dropped rather than repeated.
// Composed here rather than as the user works, so the note field stays theirs — ADR 0007.
function composeNote(customNote: string, tagLabels: string[]): string {
  const written = customNote.trim();
  const tags = tagLabels.filter((label) => !hasSegment(written, label));
  return [written, ...tags].filter((part) => part.trim() !== "").join(NOTE_SEPARATOR);
}

// The tags taken, as they read on screen. Driven off the catalogue list rather than the
// selection, so the order is the order the chips are in however they were tapped.
function selectedTagLabels(action: PickedAction, translate: (key: string) => string): string[] {
  return action.tags
    .filter((tag) => action.selectedTags.includes(tag.tag))
    .map((tag) => catalogueLabel(tag.i18n_key, tag.tag, translate));
}

// What one Action's note says. The Summary shows this and the save path sends it, so what
// the user reads before saving is the string that is saved.
export function actionNote(action: PickedAction, translate: (key: string) => string): string {
  return composeNote(action.customNote, selectedTagLabels(action, translate));
}

// The wizard speaks days, which is also what a service date is.
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// The parts an action was performed on, as a set: the chips write them in tap order, so
// unpicking a part and picking it again reorders the list without changing what it says.
function sameComponents(left: number[], right: number[]): boolean {
  if (left.length !== right.length) return false;
  const seen = new Set(left);
  return right.every((id) => seen.has(id));
}

// The names given to the parts going on. Keyed by the part coming off, so order is not a
// difference; a key held with no text says the same as no key at all.
function sameDescriptions(left: Record<number, string>, right: Record<number, string>): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].every((key) => (left[Number(key)] ?? "") === (right[Number(key)] ?? ""));
}

// The tags taken, as a set: the chips are stored in tap order, so untapping one and
// taking it again reorders the list without changing which tags are taken.
function sameTags(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const seen = new Set(left);
  return right.every((tag) => seen.has(tag));
}

// Whether one recorded action still says what it said. Only what the user can type or tap
// is compared - the name, the i18n key, the tags and the candidate parts are catalogue
// data, and comparing those would call a react-query refetch an edit.
function sameAction(left: PickedAction, right: PickedAction): boolean {
  return (
    left.actionId === right.actionId &&
    left.replaceAction === right.replaceAction &&
    left.customNote === right.customNote &&
    sameTags(left.selectedTags, right.selectedTags) &&
    sameDescriptions(left.newDescriptions, right.newDescriptions) &&
    // null is "no figure recorded", which is not the same as 0.
    left.partialCost === right.partialCost &&
    sameComponents(left.componentIds, right.componentIds)
  );
}

// The baseline for a block the user has only just opened, which has nothing in it yet.
export const NO_ACTIONS: PickedAction[] = [];

// Whether a block still holds what it held when the user opened it. Back asks before it
// throws work away, and this is what decides there is work to throw: an untouched block
// costs nothing to leave, however many times it was passed through.
export function sameActionLists(left: PickedAction[], right: PickedAction[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((action, index) => sameAction(action, right[index]));
}
