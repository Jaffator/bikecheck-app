// A plan's day as every card writes it, and whether it has gone by (ADR 0038).
import dayjs from "dayjs";
import { pattern } from "@/features/service/serviceDates";
import { DUE_FROM, attentionColor } from "./attentionLevel";

// "Sat 4 Oct" / "so 4. 10.": the weekday is what an owner books by.
const PLAN_DAY_BY_LANGUAGE: Record<string, string> = {
  cs: "dd D. M.",
  en: "ddd D MMM",
};

// A passed plan wears the warning level's colour until the job is recorded or the plan moves.
export const PASSED_PLAN_COLOR = attentionColor(DUE_FROM);

export function planDayLabel(day: string, language: string): string {
  return dayjs(day).format(pattern(PLAN_DAY_BY_LANGUAGE, language));
}

// Today by the owner's own clock, as the calendar and the API write a day.
export function localToday(): string {
  return dayjs().format("YYYY-MM-DD");
}

export function isPlanPassed(day: string): boolean {
  return day < localToday();
}
