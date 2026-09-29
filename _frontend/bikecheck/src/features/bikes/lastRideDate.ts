import dayjs from "dayjs";

// "23. 9." this year, "23. 9. 2025" before it - the year only where it tells something.
export function lastRideDate(startedAt: string): string {
  const day = dayjs(startedAt);
  return day.year() === dayjs().year() ? day.format("D. M.") : day.format("D. M. YYYY");
}
