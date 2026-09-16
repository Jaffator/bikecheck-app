// The rest after "Send it again" (ADR 0031): one tap sends one Verification Email, then the
// control sleeps for a minute so an impatient rider does not fire off five copies. Shared
// by the inbox state and the refused login, so both rest the same way.
import { useCallback, useEffect, useState } from "react";

const COOLDOWN_SECONDS = 60;
const TICK_MS = 1000;

export interface ResendCooldown {
  // Whole seconds until the next send is allowed; 0 means the control is live.
  secondsLeft: number;
  // Starts the rest from its full length.
  start: () => void;
}

export function useResendCooldown(seconds = COOLDOWN_SECONDS): ResendCooldown {
  // When the rest ends, as a timestamp: a timer throttled in the background cannot stretch it.
  const [until, setUntil] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (until === null) return;
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setSecondsLeft(left);
      // Ends the effect, which clears the interval.
      if (left === 0) setUntil(null);
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [until]);

  const start = useCallback((): void => {
    setSecondsLeft(seconds);
    setUntil(Date.now() + seconds * 1000);
  }, [seconds]);

  return { secondsLeft, start };
}
