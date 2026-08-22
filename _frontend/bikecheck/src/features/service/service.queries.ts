// React Query hooks for the service history.
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
import {
  createService,
  deleteService,
  getBikeCategories,
  getCategoryActions,
  getServiceDetail,
  getServiceHistory,
  uploadServiceAttachment,
} from "./service.api";
import type {
  BikeCategory,
  CategoryActions,
  CreateServiceInput,
  ServiceRecord,
  ServiceHistoryPage,
  UploadedAttachment,
} from "./service.types";

// The service page answers "what did I last do", so it shows only the latest few.
export const RECENT_SERVICE_COUNT = 3;

// Limits each request payload on the full history.
const PAGE_SIZE = 20;

// Distinguishes the all-bikes cache from a filtered one.
function bikeKey(bikeId?: number): number | "all" {
  return bikeId ?? "all";
}

// The most recent services, for the landing page.
export function useRecentServices(bikeId?: number): UseQueryResult<ServiceHistoryPage> {
  return useQuery({
    queryKey: ["services", "recent", bikeKey(bikeId)],
    queryFn: () => getServiceHistory(RECENT_SERVICE_COUNT, 0, bikeId),
  });
}

// The full history, paged in as the user scrolls.
export function useServiceHistory(bikeId?: number): UseInfiniteQueryResult<InfiniteData<ServiceHistoryPage>, Error> {
  return useInfiniteQuery({
    queryKey: ["services", "history", bikeKey(bikeId)],
    queryFn: ({ pageParam }) => getServiceHistory(PAGE_SIZE, pageParam, bikeId),
    initialPageParam: 0,
    // Stop when every service is loaded.
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((count, page) => count + page.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });
}

// The Component Categories the chosen bike has parts in — the wizard's second step.
export function useBikeCategories(bikeId: number | null): UseQueryResult<BikeCategory[]> {
  return useQuery({
    queryKey: ["services", "categories", bikeId],
    queryFn: () => getBikeCategories(bikeId ?? 0),
    enabled: bikeId !== null,
  });
}

// The work the bike can receive in one category — the wizard's third step.
export function useCategoryActions(
  bikeId: number | null,
  categoryId: number | null,
): UseQueryResult<CategoryActions> {
  return useQuery({
    queryKey: ["services", "category-actions", bikeId, categoryId],
    queryFn: () => getCategoryActions(bikeId ?? 0, categoryId ?? 0),
    enabled: bikeId !== null && categoryId !== null,
  });
}

// One recorded Service in full.
export function useServiceDetail(id: number): UseQueryResult<ServiceRecord> {
  return useQuery({
    queryKey: ["services", "detail", id],
    queryFn: () => getServiceDetail(id),
  });
}

// A receipt is stored as soon as it is picked, so Save is not a long silent wait.
export function useUploadServiceAttachment(): UseMutationResult<UploadedAttachment, Error, File> {
  return useMutation({
    mutationFn: (file: File) => uploadServiceAttachment(file),
  });
}

// Refresh every history list after a Service is written.
export function useCreateService(): UseMutationResult<ServiceRecord, Error, CreateServiceInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateServiceInput) => createService(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

// Refresh every history list after a Service is removed from it.
export function useDeleteService(): UseMutationResult<ServiceRecord, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteService(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}
