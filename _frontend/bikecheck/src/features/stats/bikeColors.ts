// One colour per bike in every chart. Clear of the money ramp's yellows and the attention
// reds, so a line never reads as spend or as a warning.
const BIKE_COLORS = ["#5B9BF0", "#B18CF0", "#3EC4C4", "#EC7FC0", "#B7C9D3"];

// The index is the bike's rank in the garage; a sixth bike wraps round to the first colour.
export function bikeColor(colorIndex: number): string {
  return BIKE_COLORS[colorIndex % BIKE_COLORS.length];
}
