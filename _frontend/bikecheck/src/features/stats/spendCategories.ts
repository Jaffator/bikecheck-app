// How a slice of the year's spend is named and coloured.
import { catalogueLabel } from "@/features/service/serviceLabels";
import type { SpendCategory } from "./stats.types";

// The money ramp from the design: the most expensive category lightest, "other" darkest.
const SPEND_RAMP = ["#E8DE93", "#CEC053", "#A69A3F"];
const OTHER_COLOR = "#7B722E";
// Off the ramp, so money nobody could place never reads as a category.
const UNASSIGNED_COLOR = "var(--mantine-color-cards-3)";

// Named categories come first in rank order, so their index is their rank.
export function categoryColor(category: SpendCategory, index: number): string {
  if (category.key === "unassigned") return UNASSIGNED_COLOR;
  if (category.key === "other") return OTHER_COLOR;
  return SPEND_RAMP[index];
}

export function categoryLabel(
  category: SpendCategory,
  translate: (key: string) => string,
): string {
  if (category.key === "unassigned") return translate("stats.unassigned");
  if (category.key === "other") return translate("stats.other");
  return catalogueLabel(
    category.i18n_key,
    category.group_name ?? "",
    translate,
  );
}
