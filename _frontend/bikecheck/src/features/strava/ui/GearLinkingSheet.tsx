// Pair BikeCheck bikes with their Strava gear: one bike gets its own list, several share the card sheet.
import type { ReactElement } from "react";
import { MultiGearSheet } from "./MultiGearSheet";
import { SingleGearSheet } from "./SingleGearSheet";

interface GearLinkingSheetProps {
  opened: boolean;
  onClose: () => void;
  // Undefined lists unpaired bikes; detail pages pass one id.
  bikeIds?: number[];
}

export function GearLinkingSheet({ opened, onClose, bikeIds }: GearLinkingSheetProps): ReactElement {
  if (bikeIds?.length === 1) {
    return <SingleGearSheet opened={opened} onClose={onClose} bikeId={bikeIds[0]} />;
  }
  return <MultiGearSheet opened={opened} onClose={onClose} />;
}
