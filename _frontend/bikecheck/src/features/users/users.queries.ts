// React Query hooks. This is where loading / error / cache state lives —
// the stuff you used to write by hand with useState + useEffect.
import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import { getCurrentUser, loginUser, registerUser, sendGoogleToken, logoutUser, updateUser } from "./users.api";
import type {
  User,
  LoginCredentials,
  RegisterCredentials,
  GoogleTokenCredentials,
  UpdateUserPayload,
} from "./users.types";
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

// Logout user.
export function useLogout(): UseMutationResult<void, ApiError, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      // Order matters. This has to run while the mounted useCurrentUser is
      // still attached to the query, so it gets notified and re-renders into
      // the login page. clear() would destroy that query first, leaving the
      // observer watching a dead object and the app on screen until a reload.
      queryClient.setQueryData(["currentUser"], null);
      // Everything else belonged to the user who just left, so drop it —
      // except currentUser, which must keep the observer attached.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "currentUser" });
    },
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

// Profile updates (language, currency, weight, …). The response is the full
// user, so it replaces the cached one instead of triggering a refetch.
export function useUpdateUser(): UseMutationResult<User, ApiError, { id: number; data: UpdateUserPayload }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateUser(id, data),
    onSuccess: (user) => {
      queryClient.setQueryData(["currentUser"], user);
    },
  });
}

// Native Google sign-in. The backend sets the auth cookies and returns the
// user, so this behaves exactly like useLogin — there is no redirect, writing
// currentUser is what flips the auth gate to the app.
export function useGoogleNative(): UseMutationResult<User, ApiError, GoogleTokenCredentials> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendGoogleToken,
    onSuccess: (user) => {
      queryClient.setQueryData(["currentUser"], user);
    },
  });
}
