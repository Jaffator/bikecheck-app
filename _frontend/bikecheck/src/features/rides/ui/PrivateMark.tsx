// A small lock on a ride only its rider can see on Strava; nothing for a public one.
import type { ReactElement } from "react";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PrivateMarkProps {
  isPrivate: boolean;
  size?: number;
}

export function PrivateMark({ isPrivate, size = 13 }: PrivateMarkProps): ReactElement | null {
  const { t } = useTranslation();
  if (!isPrivate) return null;

  return (
    <Lock
      size={size}
      strokeWidth={2.2}
      color="var(--color-text-dim)"
      aria-label={t("rides.private")}
      role="img"
      // Inline after the title; Tailwind's preflight makes every svg a block.
      style={{ display: "inline", flexShrink: 0, marginInlineStart: 6, verticalAlign: "-0.125em" }}
    />
  );
}
