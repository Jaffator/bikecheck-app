// Chat query hooks. Only the thread is cached here - the answer arrives on a stream, which
// react-query has nothing to say about.
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { deleteChatThread, getChatThread } from "./chat.api";
import type { ChatMessage, ChatThreadDeleted } from "./chat.types";

export const CHAT_THREAD_KEY = ["ai-chat", "thread"];

// The one thread of the logged-in user, so a return to the page lands where they left it.
export function useChatThread(): UseQueryResult<ChatMessage[]> {
  return useQuery({
    queryKey: CHAT_THREAD_KEY,
    queryFn: getChatThread,
  });
}

// The whole thread thrown away. The cache is emptied outright rather than refetched: there is
// nothing left to read, and the empty state must not wait for a round trip to say so.
export function useDeleteChatThread(): UseMutationResult<ChatThreadDeleted, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteChatThread,
    onSuccess: () => {
      queryClient.setQueryData<ChatMessage[]>(CHAT_THREAD_KEY, []);
    },
  });
}
