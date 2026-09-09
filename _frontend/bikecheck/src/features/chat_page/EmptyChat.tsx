// The screen before the first question. No illustration exists for the chat, so the tab's own
// icon stands in the band one would fill.
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { PiChatCircleDots } from "react-icons/pi";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";

const ICON_SIZE = 96;

export function EmptyChat(): ReactElement {
  const { t } = useTranslation();

  return (
    <EmptyStateLayout
      icon={<PiChatCircleDots size={ICON_SIZE} />}
      title={t("chat.emptyTitle")}
      body={t("chat.emptyBody")}
    />
  );
}
