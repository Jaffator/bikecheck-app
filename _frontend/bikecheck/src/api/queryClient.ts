import { QueryClient } from "@tanstack/react-query";
import { setOnSessionExpired } from "./client";

// One shared client for the whole app. Sensible defaults so screens don't
// refetch on every mount and a single failed request doesn't retry forever.
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

// The single place the app logs itself out: the refresh token is gone or
// revoked, so no request can succeed any more. Mirrors useLogout — currentUser
// is set to null while its observer is still attached, so the auth gate
// re-renders into the login page, and everything else is dropped afterwards.
setOnSessionExpired(() => {
  queryClient.setQueryData(["currentUser"], null);
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "currentUser" });
});
