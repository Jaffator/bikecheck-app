// React Query hooks own user loading, error, and cache state.
import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import {
  getCurrentUser,
  loginUser,
  registerUser,
  sendGoogleToken,
  logoutUser,
  updateUser,
  changePassword,
  getAccountDeletionSummary,
  deleteAccount,
} from "./users.api";
import type {
  User,
  LoginCredentials,
  RegisterCredentials,
  GoogleTokenCredentials,
  UpdateUserPayload,
  ChangePasswordPayload,
  AccountDeletionSummary,
} from "./users.types";
import type { ApiError } from "@/api/client";

// Drives the auth gate; 401 responses do not retry.
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
      // Preserve the current-user observer so the auth gate rerenders.
      queryClient.setQueryData(["currentUser"], null);
      // Removes all user-scoped cached data except currentUser.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "currentUser" });
    },
  });
}

// Login writes the successful user into the auth-gate cache.
export function useLogin(): UseMutationResult<User, ApiError, LoginCredentials> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loginUser,
    onSuccess: (user) => {
      queryClient.setQueryData(["currentUser"], user);
    },
  });
}

// Registration creates an account but leaves currentUser untouched.
export function useRegistration(): UseMutationResult<User, ApiError, RegisterCredentials> {
  return useMutation({
    mutationFn: registerUser,
  });
}

// Profile updates replace the cached user with the returned record.
export function useUpdateUser(): UseMutationResult<User, ApiError, { id: number; data: UpdateUserPayload }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateUser(id, data),
    onSuccess: (user) => {
      queryClient.setQueryData(["currentUser"], user);
    },
  });
}

// Changing the password touches no cached user: the account is the same one, and the
// session the change was made from survives it.
export function useChangePassword(): UseMutationResult<void, ApiError, ChangePasswordPayload> {
  return useMutation({
    mutationFn: changePassword,
  });
}

// Native Google sign-in writes the returned user into the auth cache.
export function useGoogleNative(): UseMutationResult<User, ApiError, GoogleTokenCredentials> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendGoogleToken,
    onSuccess: (user) => {
      queryClient.setQueryData(["currentUser"], user);
    },
  });
}

// What the delete dialog names. Read only while the sheet is open, and never cached past
// it — the counts are a warning, and a stale warning is a wrong one.
export function useAccountDeletionSummary(enabled: boolean): UseQueryResult<AccountDeletionSummary> {
  return useQuery({
    queryKey: ["accountDeletionSummary"],
    queryFn: getAccountDeletionSummary,
    enabled,
    gcTime: 0,
    staleTime: 0,
  });
}

// The account is gone, so the session goes with it — the same drop as logging out, since
// there is nothing left to come back to.
export function useDeleteAccount(): UseMutationResult<void, ApiError, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      // Preserve the current-user observer so the auth gate rerenders onto the login screen.
      queryClient.setQueryData(["currentUser"], null);
      // Removes all user-scoped cached data except currentUser.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "currentUser" });
    },
  });
}
