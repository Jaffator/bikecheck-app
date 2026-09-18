// PROTOTYPE #121 / #128 — throwaway. Mounted once in AppLayout: the drawer in its settled
// shape (#121 winner: cards) and the floating switcher, which now drives /follows. Dev only.
import type { ReactElement } from "react";
import { PrototypeSwitcher } from "./PrototypeSwitcher";
import { ShareDrawer } from "./ShareDrawer";

export function ProfilePrototypeMount(): ReactElement | null {
  if (!import.meta.env.DEV) return null;

  return (
    <>
      <ShareDrawer variant="2" />
      <PrototypeSwitcher />
    </>
  );
}
