// React Query hooks for the owner's Public Profile settings.
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { ApiError } from "@/api/client";
import { updateBike } from "@/features/bikes/bikes.api";
import { getMyProfile, getProfileBike, getProfileBikeServices, getProfileGarage, updateMyProfile } from "./profile.api";
import type {
  Profile,
  ProfileBikeResponse,
  ProfileGarageResponse,
  ProfileServicesPage,
  SaveSharingInput,
} from "./profile.types";

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

// One of somebody's bikes at /users/:handle/:bikeId, keyed under the garage so a save in the
// share drawer refreshes it too. A closed profile or a hidden bike is an answer, not a fault.
export function useProfileBike(handle: string, bikeId: number): UseQueryResult<ProfileBikeResponse, ApiError> {
  return useQuery<ProfileBikeResponse, ApiError>({
    queryKey: [...PROFILE_GARAGE_QUERY_KEY, handle, "bike", bikeId],
    queryFn: () => getProfileBike(handle, bikeId),
    enabled: handle !== "" && Number.isInteger(bikeId),
    retry: false,
  });
}

// The Services past the ones the bike page carries, paged in as "show older" is tapped. The
// bike brought the first page, so this starts where it stopped and never fetches on its own.
export function useProfileBikeServices(
  handle: string,
  bikeId: number,
  firstPageCount: number,
): UseInfiniteQueryResult<InfiniteData<ProfileServicesPage>, ApiError> {
  return useInfiniteQuery<ProfileServicesPage, ApiError, InfiniteData<ProfileServicesPage>, readonly unknown[], number>({
    queryKey: [...PROFILE_GARAGE_QUERY_KEY, handle, "bike", bikeId, "services"],
    queryFn: ({ pageParam }) => getProfileBikeServices(handle, bikeId, pageParam),
    initialPageParam: firstPageCount,
    // Stop once the bike's first page and these together hold every Service.
    getNextPageParam: (lastPage, allPages) => {
      const loaded = firstPageCount + allPages.reduce((count, page) => count + page.services.length, 0);
      return loaded < lastPage.total_count ? loaded : undefined;
    },
    enabled: false,
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
