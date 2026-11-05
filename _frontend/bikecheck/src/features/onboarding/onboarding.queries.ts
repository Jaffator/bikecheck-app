import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import type { ApiError } from "@/api/client";
import type { User } from "@/features/users/users.types";
import { markWelcomeSeen } from "./onboarding.api";

// Safe to repeat: the server keeps the first stamp. Welcome closes itself, so a failed save holds nobody.
export function useMarkWelcomeSeen(): UseMutationResult<User, ApiError, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markWelcomeSeen,
    retry: 2,
    onSuccess: (user) => {
      queryClient.setQueryData(["currentUser"], user);
    },
  });
}
