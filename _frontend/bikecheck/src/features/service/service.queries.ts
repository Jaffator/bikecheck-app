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
  createActionTag,
  createService,
  deleteActionTag,
  deleteService,
  getBikeCategories,
  getCategoryActions,
  getHistoryTotals,
  getServiceDetail,
  getServiceHistory,
  uploadServiceAttachment,
} from "./service.api";
import type {
  ActionTag,
  HistoryTotals,
  ServicePeriod,
  BikeCategory,
  CategoryActions,
  CreateActionTagInput,
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

// Distinguishes an all-time cache from one narrowed to a period.
function periodKey(period: ServicePeriod): string {
  return `${period.from ?? "*"}..${period.to ?? "*"}`;
}

// The full history, paged in as the user scrolls.
export function useServiceHistory(
  bikeId: number | undefined,
  period: ServicePeriod,
): UseInfiniteQueryResult<InfiniteData<ServiceHistoryPage>, Error> {
  return useInfiniteQuery({
    queryKey: ["services", "history", bikeKey(bikeId), periodKey(period)],
    queryFn: ({ pageParam }) => getServiceHistory(PAGE_SIZE, pageParam, bikeId, period),
    initialPageParam: 0,
    // Stop when every service is loaded.
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((count, page) => count + page.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });
}

// The History Totals for the filter the history is showing. A key of its own, so paging
// the list does not refetch them and they survive the scroll.
export function useHistoryTotals(bikeId: number | undefined, period: ServicePeriod): UseQueryResult<HistoryTotals> {
  return useQuery({
    queryKey: ["services", "totals", bikeKey(bikeId), periodKey(period)],
    queryFn: () => getHistoryTotals(bikeId, period),
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

// A tag the user added themselves joins the catalogue, so every open action step must
// re-read it.
export function useCreateActionTag(): UseMutationResult<ActionTag, Error, CreateActionTagInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateActionTagInput) => createActionTag(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["services", "category-actions"] });
    },
  });
}

// Removing one is the same refresh in the other direction.
export function useDeleteActionTag(): UseMutationResult<ActionTag, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteActionTag(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["services", "category-actions"] });
    },
  });
}

// One recorded Service in full. Null is the closed sheet, which asks for nothing.
export function useServiceDetail(id: number | null): UseQueryResult<ServiceRecord> {
  return useQuery({
    queryKey: ["services", "detail", id],
    queryFn: () => getServiceDetail(id ?? 0),
    enabled: id !== null,
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
