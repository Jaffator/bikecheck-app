// The measures of the sag pictures that the gauge beside them needs, kept apart from the
// drawings so a figure can be set against a part's edge.
import type { SuspensionPart } from "../dialBrand";

// Every picture is this wide; its height follows the gauge's size.
export const PICTURE_WIDTH = 64;
// The fork's lower and the shock's air can: the widest parts, centred in the picture.
export const LOWER_WIDTH = 28;
export const CAN_WIDTH = 40;

// The right edge of each picture's ink - the fork's lower, the shock's can - so a figure can be
// set beside the part itself rather than beside the picture's blank margin.
export const PICTURE_INK_RIGHT: Record<SuspensionPart, number> = {
  Fork: (PICTURE_WIDTH + LOWER_WIDTH) / 2,
  Shock: (PICTURE_WIDTH + CAN_WIDTH) / 2,
};
