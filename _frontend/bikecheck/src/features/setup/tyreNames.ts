// The tyres the Setup card names in its header, as the owner described them.
import { isDismounted } from "@/features/components/componentLabels";
import type { BikeComponent } from "@/features/components/components.types";

// The seeded part type both tyres are, told apart by position - as the profile service reads them.
const TIRE_TYPE = "Tire";

type TyreSide = "front" | "rear";

function tyreName(components: BikeComponent[] | undefined, side: TyreSide): string | null {
  const tyre = components?.find(
    (component) =>
      component.component_type === TIRE_TYPE && component.position?.toLowerCase() === side && !isDismounted(component),
  );
  return tyre?.component_desc?.trim() || null;
}

// "Assegai / DHR II"; one name when both tyres match or only one is described.
export function tyreNames(components: BikeComponent[] | undefined): string | null {
  const front = tyreName(components, "front");
  const rear = tyreName(components, "rear");
  if (front === null || rear === null || front === rear) return front ?? rear;
  return `${front} / ${rear}`;
}
