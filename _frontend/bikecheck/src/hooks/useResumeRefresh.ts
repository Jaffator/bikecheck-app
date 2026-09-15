import { useEffect } from "react";
import { App } from "@capacitor/app";
import { useQueryClient } from "@tanstack/react-query";

// What a ride landing on the server moves: the Service Tracking readings, the ride lists,
// the bike totals and the bell. Rides arrive while the app is away, so every return asks
// for all of them again.
const RIDE_DERIVED_KEYS = [["tracked-actions"], ["rides"], ["pendingRides"], ["bikes"], ["notifications"]];

// Drops the ride-derived reads whenever the app comes back to the foreground.
export function useResumeRefresh(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) return;
      for (const queryKey of RIDE_DERIVED_KEYS) {
        void queryClient.invalidateQueries({ queryKey });
      }
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [queryClient]);
}
