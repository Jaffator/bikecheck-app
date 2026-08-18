// The shape step 2 collects, kept out of the component so the wizard can read
// and validate it without importing the view.

// Suspension is stored as two independent booleans on the bike, but the user
// picks one of three mutually exclusive layouts.
export type SuspensionLayout = "hardtail" | "full" | "none";

export const FRAME_SIZES = ["S", "M", "L", "XL", "other"] as const;
export type FrameSize = (typeof FRAME_SIZES)[number];

export const WHEEL_SIZES = ['26"', '27.5"', '29"', "700C", "650B", "Mullet"] as const;
export type WheelSize = (typeof WHEEL_SIZES)[number];

export interface BikeSpecificationValues {
  // What the user calls this bike, which is not the model name — "Enduro do
  // lesa" next to a Stumpjumper. Optional: the model name heads the bike when
  // it is left empty.
  bikeName: string;
  // Free text so the field can be cleared; parsed to total_km on save.
  currentMileage: string;
  category: string | null;
  suspension: SuspensionLayout | null;
  frameSize: FrameSize | null;
  // Free text — a number for road frames, empty when the user picked a letter.
  sizeLength: string;
  wheelSize: WheelSize | null;
  ebike: boolean;
}

// Every field the step asks for has to be answered before moving on. `ebike` is
// a switch that always holds an answer, and `sizeLength` only counts when the
// frame size is "other" — the letter sizes already say how big the frame is.
export function isBikeSpecificationComplete(values: BikeSpecificationValues): boolean {
  if (values.category === null) return false;
  if (values.suspension === null) return false;
  if (values.frameSize === null) return false;
  if (values.wheelSize === null) return false;
  if (values.frameSize === "other" && values.sizeLength.trim() === "") return false;
  return true;
}
