// The measures every gauge on the sheet shares, so a figure drawn beside an arc, a picture or
// a column is set the same way as one drawn inside an arc, and a picture can be drawn to it.
import { STEP_BUTTON_SIZE } from "./stepButtonProps";

// The two columns every gauge grid on the sheet is laid out in; the token row under a grid
// reads the same spacing to set its steppers under the grid's outer ones.
export const GAUGE_GRID_SPACING = "xl";

// The gap between the minus and the plus of a click row's pair - wide enough for the count to
// sit in it - and between the figure and a unit set beside it.
export const STEP_PAIR_GAP = 25;
// The pair under a gauge has nothing between its buttons, so they stand closer.
export const GAUGE_PAIR_GAP = 12;
export const FIGURE_UNIT_GAP = 4;
// A minus and a plus with the gap between them, as they stand under every gauge.
export const STEP_PAIR_WIDTH = STEP_BUTTON_SIZE * 2 + STEP_PAIR_GAP;

// Between a gauge's name and the body under it. Wide, so the controls read as one group with
// their figure rather than hanging off the heading.
export const GAUGE_LABEL_GAP = 18;

// The three lines of a readout, top to bottom: the figure, its unit, a second reading.
export const FIGURE_LINE_HEIGHT = 1.1;
export const UNIT_LINE_HEIGHT = 1.2;
export const HINT_FONT_SIZE = 11;
export const HINT_LINE_HEIGHT = 1.4;

// The arc's stroke at the gauge's size; every readout is lifted by it, arc or not.
export function arcStroke(size: number): number {
  return Math.round(size / 13);
}

// The figure is drawn large; a little smaller when the gauge is.
export function figureFontSize(size: number): number {
  return size >= 120 ? 28 : 24;
}

export function unitFontSize(size: number): number {
  return size >= 120 ? 13 : 12;
}

// Where the middle of the figure falls, measured from the top of a body this size: the
// readout's three lines centred in the body above the lift, and half the figure's line down.
export function figureLine(size: number): number {
  const figure = figureFontSize(size) * FIGURE_LINE_HEIGHT;
  const unit = unitFontSize(size) * UNIT_LINE_HEIGHT;
  const hint = HINT_FONT_SIZE * HINT_LINE_HEIGHT;
  const top = (size - arcStroke(size) - figure - unit - hint) / 2;
  return top + figure / 2;
}
