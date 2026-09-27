// A ride's length as clock time, "134" → "2:14 h", so nobody converts minutes in their head.
export function formatDuration(minutes: number): string {
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return `${String(hours)}:${String(rest).padStart(2, "0")} h`;
}
