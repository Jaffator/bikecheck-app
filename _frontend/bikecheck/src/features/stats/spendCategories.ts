// How a slice of the year's spend is named.
import { catalogueLabel } from "@/features/service/serviceLabels";
import type { SpendCategory } from "./stats.types";

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
