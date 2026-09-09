// Chat query hooks. Only the thread is cached here - the answer arrives on a stream, which
// react-query has nothing to say about.
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getChatThread } from "./aiChat.api";
import type { ChatMessage } from "./aiChat.types";

export const CHAT_THREAD_KEY = ["ai-chat", "thread"];

// The one thread of the logged-in user, so a return to the page lands where they left it.
export function useChatThread(): UseQueryResult<ChatMessage[]> {
  return useQuery({
    queryKey: CHAT_THREAD_KEY,
    queryFn: getChatThread,
  });
}
