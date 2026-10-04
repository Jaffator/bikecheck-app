import { useState } from "react";

// Counts a sheet's openings: a body keyed on it starts fresh on each one, yet stays mounted
// while it closes, so it slides out instead of vanishing.
export function useOpeningCount(opened: boolean): number {
  const [count, setCount] = useState(0);
  const [wasOpened, setWasOpened] = useState(opened);

  if (opened !== wasOpened) {
    setWasOpened(opened);
    if (opened) setCount(count + 1);
  }

  return count;
}
