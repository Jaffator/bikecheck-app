// A ride a notification opened, held back from the Rides page's own drawer until the check-in prompt,
// asked after the tap, has answered: a ride it holds is the locked walk's, so it never opens twice.
import { useEffect, useState } from "react";
import { promptHolds } from "./checkInQueue";
import { useCheckInPrompt } from "./rides.queries";

export function useReleasedRideLink(activityId: string | undefined): string | undefined {
  const { refetch } = useCheckInPrompt();
  const [released, setReleased] = useState<string | null>(null);
  const [asked, setAsked] = useState(activityId);

  // A new tap waits again, even for a ride let through before.
  if (asked !== activityId) {
    setAsked(activityId);
    setReleased(null);
  }

  useEffect(() => {
    if (activityId === undefined) return;
    let current = true;
    // A cached prompt may predate the ride: an app resumed from a notification still holds the old one.
    void refetch().then(({ data }) => {
      if (current && !promptHolds(data, activityId)) setReleased(activityId);
    });
    return () => {
      current = false;
    };
  }, [activityId, refetch]);

  return activityId !== undefined && activityId === released ? activityId : undefined;
}
