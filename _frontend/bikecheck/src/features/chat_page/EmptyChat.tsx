// The screen before the first question. No illustration exists for the chat, so the app's own
// mark stands in the band one would fill.
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import Bikecheck from "@/assets/icons/bikecheck/bikecheck.svg?react";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";

// The mark is wider than it is tall, so it is sized by its width and the height follows.
const ICON_WIDTH = 100;
const ICON_HEIGHT = 62;

export function EmptyChat(): ReactElement {
  const { t } = useTranslation();

  return (
    <EmptyStateLayout
      icon={<Bikecheck width={ICON_WIDTH} height={ICON_HEIGHT} />}
      title={t("chat.emptyTitle")}
      body={t("chat.emptyBody")}
      // The chat page centres the state in the space it has, so the layout adds no band.
      bandHeight="auto"
    />
  );
}
