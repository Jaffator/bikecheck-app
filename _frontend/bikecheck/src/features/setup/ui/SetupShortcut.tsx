// Home's way straight into one bike's setup, sitting on the row that opens the bike.
import type { CSSProperties, MouseEvent, ReactElement } from "react";
import { ActionIcon, UnstyledButton } from "@mantine/core";
import { SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

// A finger needs about 44 px; the negative margin keeps the row its height.
const TAP_AREA: CSSProperties = { padding: 5, margin: -5, flexShrink: 0, borderRadius: "var(--mantine-radius-md)" };

export function SetupShortcut({ bikeId }: { bikeId: number }): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  function open(event: MouseEvent<HTMLButtonElement>): void {
    // The row under it opens the bike.
    event.stopPropagation();
    void navigate(`/bikes/${String(bikeId)}/setup`);
  }

  return (
    <UnstyledButton aria-label={t("setup.title")} onClick={open} style={TAP_AREA}>
      {/* A span: the frame is drawn inside the real button, which carries the larger tap area. */}
      <ActionIcon component="span" variant="outline" radius="md" size="lg">
        <SlidersHorizontal size={16} color="var(--mantine-color-primary-6)" />
      </ActionIcon>
    </UnstyledButton>
  );
}
