// PROTOTYPE #121 — throwaway. Mounted once in AppLayout: the drawer in the current variant
// (every surface opens the same one) and the floating switcher. Dev builds only.
import type { ReactElement } from "react";
import { usePrototypeStore } from "./prototype.store";
import { PrototypeSwitcher } from "./PrototypeSwitcher";
import { ShareDrawer } from "./ShareDrawer";

export function ProfilePrototypeMount(): ReactElement | null {
  const variant = usePrototypeStore((state) => state.variant);
  if (!import.meta.env.DEV) return null;

  return (
    <>
      <ShareDrawer variant={variant} />
      <PrototypeSwitcher />
    </>
  );
}
