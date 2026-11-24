import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { ADD_BIKE } from "@/layout/navItems";
import { useBikeLimitStore } from "@/store/store";
import { hasRoom } from "./bikeLimit";
import { redeemKey } from "./billing.api";
import { BIKE_LIMIT_QUERY_KEY } from "./billing.queries";
import type { BikeLimit } from "./billing.types";
import { useAddBikeGate } from "./useAddBikeGate";

// Redeems a key from the limit sheet, then goes on to the wizard the sheet stood in front of.
export function useRedeemKey(): UseMutationResult<BikeLimit, Error, string> {
  const queryClient = useQueryClient();
  const { pathname } = useLocation();
  const enterAddBike = useAddBikeGate();

  return useMutation({
    mutationFn: redeemKey,
    onSuccess: (limit) => {
      const { opened, hide } = useBikeLimitStore.getState();
      // Closed meanwhile, or over the raised limit too: the rider stays where they are.
      const goesOn = opened && hasRoom(limit);
      // Closed before the limit changes, so the sheet slides out as it was.
      if (goesOn) hide();
      queryClient.setQueryData(BIKE_LIMIT_QUERY_KEY, limit);
      // Refused on save, the wizard is already open with everything entered.
      if (goesOn && pathname !== ADD_BIKE.path) void enterAddBike();
    },
  });
}
