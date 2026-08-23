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
  // What the Action covers, from the catalogue. Chips the user taps to write into the
  // note; each is lit while the note says what it says — see ADR 0005.
  tags: ActionTag[];
  // What was done on this occasion, in the user's own words. Tag chips write into it,
  // and the user is free to rewrite what they wrote.
  note: string;
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

// What a tag chip joins its text with, and therefore what a segment is separated by.
const NOTE_SEPARATOR = " · ";

// The note read as the segments the chips work in. Text the user typed is a segment too:
// nothing marks a segment as chip-written, which is the point — see ADR 0005.
function noteSegments(note: string): string[] {
  return note
    .split(NOTE_SEPARATOR)
    .map((segment) => segment.trim())
    .filter((segment) => segment !== "");
}

// A tag chip appends to whatever the note already says, rather than replacing it.
function appendSegment(note: string, text: string): string {
  return note.trim() === "" ? text : `${note.trimEnd()}${NOTE_SEPARATOR}${text}`;
}

// Whether the note already says this, which is the only thing that lights a chip. An
// exact segment match, so a chip is lit exactly when it can be taken back out again.
export function hasSegment(note: string, text: string): boolean {
  return noteSegments(note).includes(text.trim());
}

// Takes one segment back out and repairs the separators around it. Every copy goes: a
// note can only hold two identical segments if the user typed one themselves, and
// leaving one behind would light the chip it just untapped.
function removeSegment(note: string, text: string): string {
  const target = text.trim();
  return noteSegments(note)
    .filter((segment) => segment !== target)
    .join(NOTE_SEPARATOR);
}

// Tapping a chip means "make the note say this" or "stop saying it", depending on which
// it already does. The note is the only state either direction reads.
export function toggleSegment(note: string, text: string): string {
  return hasSegment(note, text) ? removeSegment(note, text) : appendSegment(note, text);
}

// The wizard speaks days, which is also what a service date is.
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
