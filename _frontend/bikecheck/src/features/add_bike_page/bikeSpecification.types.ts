// Define step-two values independently from the view.
// Map mutually exclusive UI suspension layouts to bike flags.
export type SuspensionLayout = "hardtail" | "full" | "none";

export const FRAME_SIZES = ["S", "M", "L", "XL", "other"] as const;
export type FrameSize = (typeof FRAME_SIZES)[number];

export const WHEEL_SIZES = ['26"', '27.5"', '29"', "700C", "650B", "Mullet"] as const;
export type WheelSize = (typeof WHEEL_SIZES)[number];

export interface BikeSpecificationValues {
  // Optional user-defined bike name.
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

// Require every visible specification field before proceeding.
export function isBikeSpecificationComplete(values: BikeSpecificationValues): boolean {
  if (values.category === null) return false;
  if (values.suspension === null) return false;
  if (values.frameSize === null) return false;
  if (values.wheelSize === null) return false;
  if (values.frameSize === "other" && values.sizeLength.trim() === "") return false;
  return true;
}
