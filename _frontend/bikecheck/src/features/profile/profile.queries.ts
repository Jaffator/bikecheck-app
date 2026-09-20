// React Query hooks for the owner's Public Profile settings.
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { updateBike } from "@/features/bikes/bikes.api";
import { getMyProfile, updateMyProfile } from "./profile.api";
import type { Profile, SaveSharingInput } from "./profile.types";

// Shared by every surface that reads the sharing state (Settings row, dashboard card, header icon).
export const PROFILE_ME_QUERY_KEY = ["profile", "me"] as const;

export function useMyProfile(): UseQueryResult<Profile> {
  return useQuery({
    queryKey: PROFILE_ME_QUERY_KEY,
    queryFn: getMyProfile,
  });
}

// One confirm in the share drawer. The settings go first: a refused handle must leave the
// bike switches as they were. Both caches are read again whatever the outcome, so a save
// that failed halfway still shows what actually landed.
export function useSaveSharing(): UseMutationResult<Profile, Error, SaveSharingInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profile, bikes }: SaveSharingInput) => {
      const saved = await updateMyProfile(profile);
      await Promise.all(bikes.map((bike) => updateBike({ id: bike.id, bike: { is_shared: bike.is_shared }, image: null })));
      return saved;
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: PROFILE_ME_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["bikes"] });
    },
  });
}
