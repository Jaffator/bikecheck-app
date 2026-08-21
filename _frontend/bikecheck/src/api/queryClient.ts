import { QueryClient } from "@tanstack/react-query";
import { setOnSessionExpired } from "./client";

// Shared query client prevents mount refetches and unlimited retries.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
      networkMode: "always",
    },
    mutations: {
      networkMode: "always",
    },
  },
});

// Refresh failure clears user data while preserving the current-user observer.
setOnSessionExpired(() => {
  queryClient.setQueryData(["currentUser"], null);
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "currentUser" });
});
