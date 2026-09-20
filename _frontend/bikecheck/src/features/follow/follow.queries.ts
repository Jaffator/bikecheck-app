// React Query hooks for following somebody. Both mutations seed the person's profile page
// from the answer, so the button flips at once, then read the page and the dashboard again.
import { useMutation, useQueryClient, type QueryClient, type UseMutationResult } from "@tanstack/react-query";
import { PROFILE_GARAGE_QUERY_KEY, PROFILE_ME_QUERY_KEY } from "@/features/profile/profile.queries";
import type { ProfileGarageResponse, ProfileRelation } from "@/features/profile/profile.types";
import { followUser, unfollowUser } from "./follow.api";
import type { FollowResponse } from "./follow.types";

// The garage page of the person acted on, if it is in the cache: the relation moves at once
// and a garage that only a follower may read drops with the row.
function seedRelation(queryClient: QueryClient, handle: string, relation: ProfileRelation): void {
  queryClient.setQueryData<ProfileGarageResponse>([...PROFILE_GARAGE_QUERY_KEY, handle], (page) => {
    if (page === undefined) return page;
    const locked = page.visibility === "FOLLOWERS" && relation !== "FOLLOWING";
    return { ...page, relation, garage: locked ? null : page.garage };
  });
}

// Whatever the outcome, the truth is read again: the person's page and my own figures.
async function refresh(queryClient: QueryClient, handle: string): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: [...PROFILE_GARAGE_QUERY_KEY, handle] });
  await queryClient.invalidateQueries({ queryKey: PROFILE_ME_QUERY_KEY });
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
