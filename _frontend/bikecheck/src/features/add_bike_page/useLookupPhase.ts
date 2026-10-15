import { useEffect, useState } from "react";

// "finished" is the beat between the data landing and the results taking the bar's place.
export type LookupPhase = "idle" | "running" | "finished";

// Long enough to see the bar fill, short enough not to hold the results up.
const FINISH_MS = 400;

interface LookupStatus {
  // Which lookup this is (the search, a collection's URL), so leaving one is not read as it finishing.
  id: string | null;
  pending: boolean;
  succeeded: boolean;
}

// A lookup that just succeeded stays "finished" for a beat, so its bar is seen to reach 100 %.
export function useLookupPhase({ id, pending, succeeded }: LookupStatus): LookupPhase {
  const running = id !== null && pending;
  const [seen, setSeen] = useState({ id, running });
  const [finishedId, setFinishedId] = useState<string | null>(null);

  // Set during render, so the results never paint a frame before the bar has finished.
  if (seen.id !== id || seen.running !== running) {
    setSeen({ id, running });
    // Only the same lookup ending with data finishes; leaving it or switching to another does not.
    setFinishedId(seen.id === id && seen.running && !running && succeeded ? id : null);
  }

  useEffect(() => {
    if (finishedId === null) return;
    const timer = window.setTimeout(() => setFinishedId(null), FINISH_MS);
    return () => window.clearTimeout(timer);
  }, [finishedId]);

  if (running) return "running";
  return finishedId !== null && succeeded ? "finished" : "idle";
}
