// React Query hooks for rides.
import {
  keepPreviousData,
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
import {
  changeRideBike,
  deleteRideCheckIn,
  getCheckInPrompt,
  getFilteredRides,
  getRideMonths,
  getRides,
  markCheckInPromptSeen,
  saveRideCheckIn,
} from "./rides.api";
import type { Ride, RideCheckIn, RidePage } from "./rides.types";
import { TABLE_PAGE_SIZE, type RideFilter } from "./ridesTable";

// Limits each request payload.
const PAGE_SIZE = 20;

// Under "rides", so whatever refreshes the ride lists refreshes the prompt with them.
export const CHECK_IN_PROMPT_KEY = ["rides", "check-in-prompt"];

// The phone's check-in queue; only the phone's drawer asks for it.
export function useCheckInPrompt(): UseQueryResult<Ride[]> {
  return useQuery({ queryKey: CHECK_IN_PROMPT_KEY, queryFn: getCheckInPrompt });
}

export function useMarkCheckInPromptSeen(): UseMutationResult<{ success: boolean }, ApiError, void> {
  return useMutation({ mutationFn: markCheckInPromptSeen });
}

export function useSaveRideCheckIn(): UseMutationResult<RideCheckIn, ApiError, { rideId: number; checkIn: RideCheckIn }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rideId, checkIn }: { rideId: number; checkIn: RideCheckIn }) => saveRideCheckIn(rideId, checkIn),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["rides"] }),
  });
}

export function useDeleteRideCheckIn(): UseMutationResult<{ success: boolean }, ApiError, number> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rideId: number) => deleteRideCheckIn(rideId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["rides"] }),
  });
}

// Fetches confirmed rides by page.
export function useRides(): UseInfiniteQueryResult<InfiniteData<RidePage>, Error> {
  return useInfiniteQuery({
    queryKey: ["rides"],
    queryFn: ({ pageParam }) => getRides(PAGE_SIZE, pageParam),
    initialPageParam: 0,
    // Stop when every ride is loaded.
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((count, page) => count + page.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });
}

// One page of the desktop table; the last page stays up while the next loads, so the table never blinks empty.
export function useFilteredRides(filter: RideFilter, page: number): UseQueryResult<RidePage> {
  return useQuery({
    queryKey: ["rides", "filtered", filter, page],
    queryFn: () => getFilteredRides(TABLE_PAGE_SIZE, (page - 1) * TABLE_PAGE_SIZE, filter),
    placeholderData: keepPreviousData,
  });
}

export function useRideMonths(): UseQueryResult<string[]> {
  return useQuery({ queryKey: ["rides", "months"], queryFn: getRideMonths });
}

// How many rides one bike has, which is what the archive dialog says stops counting. One
// ride is asked for and thrown away; only the total is read.
export function useBikeRideCount(bikeId: number | null): UseQueryResult<number> {
  return useQuery({
    queryKey: ["rides", "count", bikeId],
    queryFn: async () => (await getRides(1, 0, bikeId ?? 0)).total,
    enabled: bikeId !== null,
  });
}

// Moves a ride to another bike; both bikes' readings, the ride lists and any band announcement change.
export function useChangeRideBike(): UseMutationResult<
  { success: boolean },
  ApiError,
  { rideId: number; bikeId: number }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rideId, bikeId }: { rideId: number; bikeId: number }) => changeRideBike(rideId, bikeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rides"] });
      void queryClient.invalidateQueries({ queryKey: ["bikes"] });
      void queryClient.invalidateQueries({ queryKey: ["bike-components"] });
      void queryClient.invalidateQueries({ queryKey: ["tracked-actions"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
