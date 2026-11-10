// One icon in the Notifications header, named for screen readers and, under a mouse, in a tooltip.
import type { ReactElement, ReactNode } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";

interface NotificationHeaderIconProps {
  label: string;
  // A mouse can hover for the name; a finger cannot, so the phone goes without.
  tooltip: boolean;
  loading?: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function NotificationHeaderIcon({ label, tooltip, loading, onClick, children }: NotificationHeaderIconProps): ReactElement {
  return (
    <Tooltip label={label} disabled={!tooltip}>
      <ActionIcon variant="transparent" size="lg" aria-label={label} loading={loading} onClick={onClick}>
        {children}
      </ActionIcon>
    </Tooltip>
  );
}
