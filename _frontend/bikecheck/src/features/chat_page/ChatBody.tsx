// The pieces of the chat page the phone and the desktop draw alike.
import type { ReactElement } from "react";
import { Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { BikeFilterChips } from "@/features/service/ui/BikeFilterChips";
import { ChatThread } from "@/features/chat/ui/ChatThread";
import { EmptyChat } from "./EmptyChat";
import type { ChatPage } from "./useChatPage";

// The thread, or what stands in for it while it loads, fails or is still empty.
export function ChatBody({ page }: { page: ChatPage }): ReactElement {
  const { t } = useTranslation();
  const { isLoading, isError, turnCount } = page;

  return (
    <>
      {isLoading && (
        <Stack gap="md">
          {[0, 1].map((row) => (
            <Skeleton key={row} h={72} radius="md" />
          ))}
        </Stack>
      )}
      {isError && <Text c="red">{t("chat.loadFailed")}</Text>}
      {!isLoading && !isError && turnCount === 0 && <EmptyChat />}
      {!isLoading && !isError && turnCount > 0 && (
        <ChatThread messages={page.messages ?? []} bikes={page.garage} pending={page.pending} />
      )}
    </>
  );
}

// A garage of one has no all-bikes chip: there is nothing else to ask about.
export function ChatBikeChips({ page }: { page: ChatPage }): ReactElement {
  return (
    <BikeFilterChips
      bikes={page.garage}
      selected={page.selectedBikeId}
      onSelect={page.selectBike}
      withAllBikes={page.garage.length > 1}
      opaque
    />
  );
}
