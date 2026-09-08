import type { ReactElement } from "react";
import { useSearchParams } from "react-router-dom";
import { PrototypeSwitcher } from "@/components/PrototypeSwitcher";
import { VariantA, NAME as NAME_A } from "./VariantA";
import { VariantB, NAME as NAME_B } from "./VariantB";
import { VariantC, NAME as NAME_C } from "./VariantC";

// PROTOTYPE ONLY - three variants of the /chat page, switchable via ?variant=.
// Answers issue #58. Throwaway: lives on branch prototype/chat-page, never merged to main.

const VARIANTS = [
  { key: "A", name: NAME_A },
  { key: "B", name: NAME_B },
  { key: "C", name: NAME_C },
];

export function ChatPrototype(): ReactElement {
  const [params] = useSearchParams();
  const variant = params.get("variant") ?? "A";

  return (
    <>
      {variant === "A" ? <VariantA /> : null}
      {variant === "B" ? <VariantB /> : null}
      {variant === "C" ? <VariantC /> : null}
      <PrototypeSwitcher variants={VARIANTS} />
    </>
  );
}
