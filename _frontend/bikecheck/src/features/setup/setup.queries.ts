// React Query hooks own Setup Profile loading, mutations and cache state. Everything is keyed
// by bike id, and every write invalidates that bike's profiles.
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { ApiError } from "@/api/client";
import { createSetupProfile, deleteSetupProfile, getSetupProfiles, updateSetupProfile } from "./setup.api";
import type { CreateSetupProfilePayload, SetupProfile, UpdateSetupProfilePayload } from "./setup.types";

function setupKey(bikeId: number): [string, number] {
  return ["setup", bikeId];
}

async function refreshProfiles(queryClient: QueryClient, bikeId: number): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: setupKey(bikeId) });
}

// The screen reads this key and picks its profile from it, so a written row lands in the
// cache before anything is refetched: the chip it selects is already there.
function writeProfile(queryClient: QueryClient, profile: SetupProfile): void {
  queryClient.setQueryData<SetupProfile[]>(setupKey(profile.bike_id), (current) => {
    if (current === undefined) return [profile];
    const known = current.some((item) => item.id === profile.id);
    return known ? current.map((item) => (item.id === profile.id ? profile : item)) : [...current, profile];
  });
}

function dropProfile(queryClient: QueryClient, profile: SetupProfile): void {
  queryClient.setQueryData<SetupProfile[]>(setupKey(profile.bike_id), (current) =>
    current?.filter((item) => item.id !== profile.id),
  );
}

async function settleProfile(queryClient: QueryClient, profile: SetupProfile): Promise<void> {
  writeProfile(queryClient, profile);
  await refreshProfiles(queryClient, profile.bike_id);
}

export function useSetupProfiles(bikeId: number): UseQueryResult<SetupProfile[]> {
  return useQuery({
    queryKey: setupKey(bikeId),
    queryFn: () => getSetupProfiles(bikeId),
  });
}

interface CreateSetupProfileInput {
  bikeId: number;
  data: CreateSetupProfilePayload;
}

export function useCreateSetupProfile(): UseMutationResult<SetupProfile, ApiError, CreateSetupProfileInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bikeId, data }: CreateSetupProfileInput) => createSetupProfile(bikeId, data),
    onSuccess: (profile) => settleProfile(queryClient, profile),
  });
}

interface UpdateSetupProfileInput {
  id: number;
  data: UpdateSetupProfilePayload;
}

export function useUpdateSetupProfile(): UseMutationResult<SetupProfile, ApiError, UpdateSetupProfileInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateSetupProfileInput) => updateSetupProfile(id, data),
    onSuccess: (profile) => settleProfile(queryClient, profile),
  });
}

export function useDeleteSetupProfile(): UseMutationResult<SetupProfile, ApiError, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteSetupProfile(id),
    onSuccess: async (profile) => {
      dropProfile(queryClient, profile);
      await refreshProfiles(queryClient, profile.bike_id);
    },
  });
}

interface SaveSetupProfileInput {
  bikeId: number;
  // Null on a bike with no profile yet: the first Save creates one under `name` (ADR 0029).
  profileId: number | null;
  name: string;
  data: UpdateSetupProfilePayload;
}

// One Save from the screen: creates the lazy first profile when there is none, then rewrites it.
export function useSaveSetupProfile(): UseMutationResult<SetupProfile, ApiError, SaveSetupProfileInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bikeId, profileId, name, data }: SaveSetupProfileInput) => {
      const id = profileId ?? (await createSetupProfile(bikeId, { name })).id;
      return await updateSetupProfile(id, data);
    },
    onSuccess: (profile) => settleProfile(queryClient, profile),
  });
}
