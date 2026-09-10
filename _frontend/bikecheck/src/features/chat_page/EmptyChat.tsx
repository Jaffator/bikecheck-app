// The screen before the first question. No illustration exists for the chat, so the tab's own
// icon stands in the band one would fill.
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { RiChatAi3Line } from "react-icons/ri";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";

const ICON_SIZE = 96;

export function EmptyChat(): ReactElement {
  const { t } = useTranslation();

  return (
    <EmptyStateLayout
      icon={<RiChatAi3Line size={ICON_SIZE} />}
      title={t("chat.emptyTitle")}
      body={t("chat.emptyBody")}
      // The chat page centres the state in the space it has, so the layout adds no band.
      bandHeight="auto"
    />
  );
}
