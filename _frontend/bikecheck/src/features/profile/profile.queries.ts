// React Query hooks for the owner's Public Profile settings.
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import type { ApiError } from "@/api/client";
import { updateBike } from "@/features/bikes/bikes.api";
import { getMyProfile, getProfileGarage, updateMyProfile } from "./profile.api";
import type { Profile, ProfileGarageResponse, SaveSharingInput } from "./profile.types";

// Shared by every surface that reads the sharing state (Settings row, dashboard card, header icon).
export const PROFILE_ME_QUERY_KEY = ["profile", "me"] as const;

// Every garage page read, whoever's; one handle's page is keyed under it.
export const PROFILE_GARAGE_QUERY_KEY = ["profile", "garage"] as const;

export function useMyProfile(): UseQueryResult<Profile> {
  return useQuery({
    queryKey: PROFILE_ME_QUERY_KEY,
    queryFn: getMyProfile,
  });
}

// Somebody's garage at /users/:handle. A closed profile is an answer, not a fault to retry.
export function useProfileGarage(handle: string): UseQueryResult<ProfileGarageResponse, ApiError> {
  return useQuery<ProfileGarageResponse, ApiError>({
    queryKey: [...PROFILE_GARAGE_QUERY_KEY, handle],
    queryFn: () => getProfileGarage(handle),
    enabled: handle !== "",
    retry: false,
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
      // The owner's preview reads what was just saved.
      await queryClient.invalidateQueries({ queryKey: PROFILE_GARAGE_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["bikes"] });
    },
  });
}
