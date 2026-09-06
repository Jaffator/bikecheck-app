// Component query hooks.
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import {
  createBikeComponent,
  createComponentType,
  deleteBikeComponent,
  dismountBikeComponent,
  getBikeComponents,
  getComponentGroups,
  getDefaultComponents,
  updateBikeComponent,
} from "./components.api";
import type {
  AssembleBikeComponent,
  BikeComponent,
  ComponentGroup,
  ComponentType,
  CreateBikeComponentInput,
  CreateComponentTypeInput,
  DeleteBikeComponentInput,
  DismountBikeComponentInput,
  UpdateBikeComponentInput,
} from "./components.types";

// Use default cache timing for seeded data.
export function useComponentGroups(): UseQueryResult<ComponentGroup[]> {
  return useQuery({
    queryKey: ["component-groups"],
    queryFn: getComponentGroups,
  });
}

// Cache defaults by e-bike status.
export function useDefaultComponents(ebike: boolean): UseQueryResult<AssembleBikeComponent[]> {
  return useQuery({
    queryKey: ["default-components", ebike],
    queryFn: () => getDefaultComponents(ebike),
  });
}

// A newly named type has to be in the catalogue before the part using it can be saved, so
// both e-bike and acoustic lists are dropped rather than only the one in front of us.
export function useCreateComponentType(): UseMutationResult<ComponentType, Error, CreateComponentTypeInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateComponentTypeInput) => createComponentType(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["default-components"] });
    },
  });
}

// The build of one bike. Read on its own key, so the section loads without holding up the
// photo and the readings above it.
export function useBikeComponents(bikeId: number): UseQueryResult<BikeComponent[]> {
  return useQuery({
    queryKey: bikeComponentsKey(bikeId),
    queryFn: () => getBikeComponents(bikeId),
  });
}

export function useCreateBikeComponent(): UseMutationResult<BikeComponent, Error, CreateBikeComponentInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBikeComponentInput) => createBikeComponent(input),
    onSuccess: async (_component, input) => {
      await queryClient.invalidateQueries({ queryKey: bikeComponentsKey(input.bike_id) });
    },
  });
}

export function useUpdateBikeComponent(): UseMutationResult<BikeComponent, Error, UpdateBikeComponentInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateBikeComponentInput) => updateBikeComponent(input),
    onSuccess: async (_component, input) => {
      await queryClient.invalidateQueries({ queryKey: bikeComponentsKey(input.bikeId) });
    },
  });
}

// Taking a part off changes the build, which the BikeCheck describes — so the bike itself
// is refreshed alongside its components.
export function useDismountBikeComponent(): UseMutationResult<BikeComponent, Error, DismountBikeComponentInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DismountBikeComponentInput) => dismountBikeComponent(input),
    onSuccess: async (_component, input) => {
      await invalidateBuild(queryClient, input.bikeId);
    },
  });
}

export function useDeleteBikeComponent(): UseMutationResult<BikeComponent, Error, DeleteBikeComponentInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteBikeComponentInput) => deleteBikeComponent(input),
    onSuccess: async (_component, input) => {
      await invalidateBuild(queryClient, input.bikeId);
    },
  });
}

function bikeComponentsKey(bikeId: number): [string, number] {
  return ["bike-components", bikeId];
}

async function invalidateBuild(
  queryClient: ReturnType<typeof useQueryClient>,
  bikeId: number,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: bikeComponentsKey(bikeId) });
  await queryClient.invalidateQueries({ queryKey: ["bikes", bikeId] });
}
