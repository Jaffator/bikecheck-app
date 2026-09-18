// PROTOTYPE #128 — throwaway. The words of the Follows screen, shared by every variant.
import { usePrototypeStore, type Visibility } from "./prototype.store";

// Why nobody follows me yet depends on whether anybody could.
export function useNoFollowersHint(): string {
  const visibility = usePrototypeStore((state) => state.visibility);
  const handle = usePrototypeStore((state) => state.handle);
  const hints: Record<Visibility, string> = {
    OFF: "Profil máš vypnutý. Nikdo tě nenajde, dokud ho nezapneš.",
    FOLLOWERS: `Lidi tě najdou v appce podle @${handle}.`,
    PUBLIC: "Pošli někomu odkaz na svou garáž.",
  };
  return hints[visibility];
}

export const NO_FOLLOWING_TITLE = "Zatím nikoho nesleduješ";
export const NO_FOLLOWING_HINT = "Najdi lidi podle jména nebo adresy.";
export const NO_FOLLOWERS_TITLE = "Zatím tě nikdo nesleduje";
export const NO_RESULTS = "Nikdo se nenašel";
export const CAPPED = "Zobrazeno prvních 20. Zpřesni hledání.";
