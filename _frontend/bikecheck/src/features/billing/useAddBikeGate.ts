import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ADD_BIKE } from "@/layout/navItems";
import { useBikeLimitStore } from "@/store/store";
import { askForRoom, knownToHaveRoom } from "./bikeLimit";

interface EnterOptions {
  replace?: boolean;
  // For an entry that stands over the page and has to get out of the sheet's way.
  onRefused?: () => void;
}

// The one way into the add-bike wizard: under the limit it opens, over it the limit sheet does.
export function useAddBikeGate(): (options?: EnterOptions) => Promise<void> {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const showLimit = useBikeLimitStore((state) => state.show);

  return useCallback(
    async ({ replace, onRefused }: EnterOptions = {}): Promise<void> => {
      if (knownToHaveRoom(queryClient) || (await askForRoom(queryClient))) {
        navigate(ADD_BIKE.path, { replace });
        return;
      }
      onRefused?.();
      showLimit();
    },
    [queryClient, navigate, showLimit],
  );
}
