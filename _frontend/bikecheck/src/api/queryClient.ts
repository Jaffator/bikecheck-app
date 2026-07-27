import { QueryClient } from "@tanstack/react-query";

// One shared client for the whole app. Sensible defaults so screens don't
// refetch on every mount and a single failed request doesn't retry forever.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
      networkMode: "always",
    },
  },
});
