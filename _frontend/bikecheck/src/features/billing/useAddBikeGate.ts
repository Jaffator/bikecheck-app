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
      const from = window.location.href;
      const hasRoom = knownToHaveRoom(queryClient) || (await askForRoom(queryClient));
      // Gone elsewhere meanwhile, or a second tap. The whole href: native routes live in the hash.
      if (window.location.href !== from) return;
      if (hasRoom) {
        navigate(ADD_BIKE.path, { replace });
        return;
      }
      onRefused?.();
      showLimit();
    },
    [queryClient, navigate, showLimit],
  );
}
