// React Query hooks for finding and following people. Both mutations seed the person's
// profile page from the answer, so the button flips at once, then read the page, the lists
// and the dashboard again.
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { PROFILE_GARAGE_QUERY_KEY, PROFILE_ME_QUERY_KEY } from "@/features/profile/profile.queries";
import type { ProfileGarageResponse, ProfileRelation } from "@/features/profile/profile.types";
import { followUser, getFollowing, searchPeople, unfollowUser } from "./follow.api";
import { SEARCH_MIN_LENGTH } from "./followSearch";
import type { FollowResponse, FollowSearchResponse, FollowingRow } from "./follow.types";

// Whom I follow and whom I asked - the "Sleduješ" panel.
export const FOLLOWING_QUERY_KEY = ["follows", "following"] as const;

// Every search answer; one query's answer is keyed under it.
export const FOLLOW_SEARCH_QUERY_KEY = ["follows", "search"] as const;

export function useFollowing(): UseQueryResult<FollowingRow[]> {
  return useQuery({
    queryKey: FOLLOWING_QUERY_KEY,
    queryFn: getFollowing,
  });
}

// Off until the query is long enough to ask. The answer the rider was reading holds its
// place while the next one lands, so typing on dims the list rather than blanking the panel.
export function useFollowSearch(query: string): UseQueryResult<FollowSearchResponse> {
  return useQuery({
    queryKey: [...FOLLOW_SEARCH_QUERY_KEY, query],
    queryFn: () => searchPeople(query),
    enabled: query.length >= SEARCH_MIN_LENGTH,
    placeholderData: keepPreviousData,
    // A typed query moves on faster than a retry schedule would.
    retry: false,
  });
}

// The garage page of the person acted on, if it is in the cache: the relation moves at once
// and a garage that only a follower may read drops with the row.
function seedRelation(queryClient: QueryClient, handle: string, relation: ProfileRelation): void {
  queryClient.setQueryData<ProfileGarageResponse>([...PROFILE_GARAGE_QUERY_KEY, handle], (page) => {
    if (page === undefined) return page;
    const locked = page.visibility === "FOLLOWERS" && relation !== "FOLLOWING";
    return { ...page, relation, garage: locked ? null : page.garage };
  });
}

// Whatever the outcome, the truth is read again: the person's page, both lists and my own
// figures. Awaited, so a button stays busy until the row it sits on reads the new relation.
async function refresh(queryClient: QueryClient, handle: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: [...PROFILE_GARAGE_QUERY_KEY, handle] }),
    queryClient.invalidateQueries({ queryKey: FOLLOWING_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: FOLLOW_SEARCH_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: PROFILE_ME_QUERY_KEY }),
  ]);
}

export function useFollow(handle: string): UseMutationResult<FollowResponse, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => followUser(handle),
    onSuccess: (answer) => seedRelation(queryClient, handle, answer.relation),
    onSettled: () => refresh(queryClient, handle),
  });
}

export function useUnfollow(handle: string): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => unfollowUser(handle),
    onSuccess: () => seedRelation(queryClient, handle, "NONE"),
    onSettled: () => refresh(queryClient, handle),
  });
}
