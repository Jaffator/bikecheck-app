// React Query hooks. This is where loading / error / cache state lives —
// the stuff you used to write by hand with useState + useEffect.
import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import { getCurrentUser, loginUser, registerUser } from "./users.api";
import type { User, LoginCredentials, RegisterCredentials } from "./users.types";
import type { ApiError } from "@/api/client";

// Used by App.tsx to decide between the protected app and the login page.
// No retry: a 401 means "not logged in", not a transient failure.
export function useCurrentUser(): UseQueryResult<User> {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    retry: false,
  });
}

// Login is a user-triggered action, so it is a mutation, not a query.
// On success we refresh currentUser, which flips the auth gate to the app.
export function useLogin(): UseMutationResult<User, ApiError, LoginCredentials> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loginUser,
    onSuccess: (user) => {
      queryClient.setQueryData(["currentUser"], user);
    },
  });
}

// Registration only creates the account — the backend does not set the auth
// cookies here, so currentUser is deliberately left untouched. The caller logs
// the user in afterwards.
export function useRegistration(): UseMutationResult<User, ApiError, RegisterCredentials> {
  return useMutation({
    mutationFn: registerUser,
  });
}
