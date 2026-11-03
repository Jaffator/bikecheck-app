// New rides since the check-in prompt last opened, walked once in the locked ride drawer: rides without
// a check-in and Unassigned Rides, newest first. A ride a notification opened goes first.
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  currentOf,
  nextOf,
  rideLinkOf,
  walkFor,
  walkHolds,
  withoutRideLink,
  type QueueWalk,
} from "@/features/rides/checkInQueue";
import type { RideWalk } from "@/features/rides/rideDetail";
import { CHECK_IN_PROMPT_KEY, useCheckInPrompt, useMarkCheckInPromptSeen } from "@/features/rides/rides.queries";
import type { CheckInPrompt } from "@/features/rides/rides.types";
import { RideDetailSheet } from "./RideDetailSheet";

const NO_PROMPT: CheckInPrompt = { rides: [], pending: [] };

// Notifications open rides here; a link anywhere else is not a ride's.
const RIDES_PATH = "/rides";

// The sheet cannot be dismissed, so nothing closes it but the walk.
const IGNORE_CLOSE = (): void => {};

export function NewRideQueue(): ReactElement {
  const { data: prompt } = useCheckInPrompt();
  const [walk, setWalk] = useState<QueueWalk | null>(null);
  const { link, dropLink } = useRideLink();
  const next = useCallback((): void => setWalk((current) => (current === null ? null : nextOf(current))), []);

  // New rides start a walk; a notification tapped mid-walk brings its ride up where the walk stands.
  const adjusted = walkFor(walk, prompt, link);
  if (adjusted !== walk) setWalk(adjusted);

  const holdsLink = walk !== null && walkHolds(walk, link);
  useEffect(() => {
    if (holdsLink) dropLink();
  }, [holdsLink, dropLink]);
  useSeenOnOpen(walk !== null && !walk.done, holdsLink);

  const item = currentOf(walk);
  const rideWalk: RideWalk | undefined =
    walk === null
      ? undefined
      : {
          position: walk.position,
          total: walk.queue.length,
          woreOffByBike: item?.ride.wore_off_by_bike ?? [],
          onNext: next,
        };

  return <RideDetailSheet item={item} onClose={IGNORE_CLOSE} walk={rideWalk} />;
}

// The ride a notification opened, and a way to take it off the URL once the walk has it.
function useRideLink(): { link: string | null; dropLink: () => void } {
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const dropLink = useCallback(
    (): void => setSearchParams((current) => withoutRideLink(current), { replace: true }),
    [setSearchParams],
  );

  return { link: pathname === RIDES_PATH ? rideLinkOf(searchParams) : null, dropLink };
}

// Seen as it opens, so another device or the next start stays shut until a new ride arrives. Held while
// a link the walk took is still on the URL: the emptied prompt would hand it to the Rides page's drawer.
function useSeenOnOpen(opened: boolean, holdsLink: boolean): void {
  const queryClient = useQueryClient();
  const { mutate: markSeen } = useMarkCheckInPromptSeen();
  // Once per walk: a later mark would pass over rides that arrived during it.
  const marked = useRef(false);

  useEffect(() => {
    if (!opened) {
      marked.current = false;
      return;
    }
    if (holdsLink || marked.current) return;
    marked.current = true;
    queryClient.setQueryData<CheckInPrompt>(CHECK_IN_PROMPT_KEY, NO_PROMPT);
    markSeen();
  }, [opened, holdsLink, queryClient, markSeen]);
}
