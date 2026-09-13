// Define step-two values independently from the view.
import type { Bike } from "@/features/bikes/bikes.types";

// Map mutually exclusive UI suspension layouts to bike flags.
export type SuspensionLayout = "hardtail" | "full" | "none";

// Map wizard suspension layouts to persisted axle flags.
export const SUSPENSION_FLAGS: Record<SuspensionLayout, { front: boolean; rear: boolean }> = {
  full: { front: true, rear: true },
  hardtail: { front: true, rear: false },
  none: { front: false, rear: false },
};

// Both ends sprung is full suspension, front alone a hardtail, neither is rigid.
export function suspensionLayout(bike: Pick<Bike, "has_front_suspension" | "has_rear_suspension">): SuspensionLayout {
  if (bike.has_front_suspension && bike.has_rear_suspension) return "full";
  if (bike.has_front_suspension) return "hardtail";
  return "none";
}

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

function isFrameSize(value: string): value is FrameSize {
  return (FRAME_SIZES as readonly string[]).includes(value);
}

function isWheelSize(value: string): value is WheelSize {
  return (WHEEL_SIZES as readonly string[]).includes(value);
}

// The inverse of the wizard's payload: a stored bike read back into step-two values, so the
// edit form starts from what the owner once picked. A frame size that is not a letter was
// typed as a length; a wheel size the chips do not know stays unselected.
export function toSpecificationValues(bike: Bike): BikeSpecificationValues {
  const size = bike.bike_size ?? "";
  const letterSize = isFrameSize(size);
  return {
    bikeName: bike.bikename ?? "",
    currentMileage: bike.total_km === null ? "" : String(bike.total_km),
    category: bike.bike_type,
    suspension: suspensionLayout(bike),
    frameSize: letterSize ? size : size === "" ? null : "other",
    sizeLength: letterSize ? "" : size,
    wheelSize: bike.wheel_size !== null && isWheelSize(bike.wheel_size) ? bike.wheel_size : null,
    ebike: bike.ebike,
  };
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
