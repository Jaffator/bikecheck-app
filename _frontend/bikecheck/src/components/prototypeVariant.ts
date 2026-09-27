// PROTOTYPE (#165) — throwaway. Which layout variant `?variant=` asks for.
import { useSearchParams } from "react-router-dom";

export interface PrototypeVariant {
  key: string;
  name: string;
}

export const VARIANT_PARAM = "variant";

// An unknown or missing key falls back to the first variant.
export function usePrototypeVariant(variants: PrototypeVariant[]): string {
  const [searchParams] = useSearchParams();
  const requested = searchParams.get(VARIANT_PARAM);
  return variants.some((variant) => variant.key === requested) ? (requested as string) : variants[0].key;
}
