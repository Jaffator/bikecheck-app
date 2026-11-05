import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import type { ApiError } from "@/api/client";
import type { User } from "@/features/users/users.types";
import { markWelcomeSeen } from "./onboarding.api";

// Closes before the server answers: a failed save must not hold the rider on the Welcome.
export function useMarkWelcomeSeen(): UseMutationResult<User, ApiError, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markWelcomeSeen,
    onMutate: () => {
      queryClient.setQueryData<User | null>(["currentUser"], (user) =>
        user ? { ...user, welcome_seen_at: new Date().toISOString() } : user,
      );
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["currentUser"], user);
    },
  });
}
