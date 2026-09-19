// PROTOTYPE #132 — throwaway. The public page speaks the reader's language (#118): chrome
// strings in both, the mock's Czech catalogue names mapped to English so the switch is
// convincing. The real page keeps these in cs.json / en.json and translates the catalogue
// through useSeededName.
import { useCallback, useEffect, useState } from "react";
import { applyLanguage, detectLanguage, type SupportedLanguage } from "@/i18n";

export type PublicLang = SupportedLanguage;

const STORAGE_KEY = "bikecheck.publicProfile.lang";

function storedLang(): PublicLang | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "cs" || value === "en" ? value : null;
  } catch {
    return null;
  }
}

// Browser first, the reader's last choice over it; the choice survives reload and the
// walk from garage to bike (#118).
export function usePublicLang(): { lang: PublicLang; toggle: () => void } {
  const [lang, setLang] = useState<PublicLang>(() => storedLang() ?? detectLanguage());

  useEffect(() => {
    void applyLanguage(lang);
  }, [lang]);

  const toggle = useCallback(() => {
    setLang((current) => {
      const next: PublicLang = current === "cs" ? "en" : "cs";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Private mode: the switch still works for this page.
      }
      return next;
    });
  }, []);

  return { lang, toggle };
}

type Pair = { cs: string; en: string };

export function pick(lang: PublicLang, pair: Pair): string {
  return lang === "cs" ? pair.cs : pair.en;
}

export const COPY = {
  publicProfile: { cs: "veřejný profil", en: "public profile" },
  publicProfileTitle: { cs: "Veřejný profil", en: "Public profile" },
  live: { cs: "Živé", en: "Live" },
  copyLink: { cs: "Zkopírovat odkaz", en: "Copy link" },
  copied: {
    cs: "Odkaz zkopírován do schránky",
    en: "Link copied to clipboard",
  },
  copyFailed: {
    cs: "Odkaz se nepodařilo zkopírovat",
    en: "Could not copy the link",
  },
  langButton: { cs: "EN", en: "CS" },
  garageIntro: {
    cs: "Garáž, jak ji majitel vede v aplikaci BikeCheck. Co změní, uvidíš tady.",
    en: "The garage as its owner keeps it in the BikeCheck app. Whatever changes, you see here.",
  },
  bikeIntro: {
    cs: "Co je na kole a co se s ním dělalo, tak jak to majitel vede v aplikaci BikeCheck. Co změní, uvidíš tady.",
    en: "What is on the bike and what was done to it, as the owner keeps it in the BikeCheck app. Whatever changes, you see here.",
  },
  bikes: { cs: "Kola", en: "Bikes" },
  bikesCount: { cs: "Kol", en: "Bikes" },
  totalDistance: { cs: "Nájezd celkem", en: "Total distance" },
  distance: { cs: "Nájezd", en: "Distance" },
  rideTime: { cs: "Čas v sedle", en: "Ride time" },
  components: { cs: "Komponent", en: "Components" },
  services: { cs: "Servisů", en: "Services" },
  swaps: { cs: "Výměn", en: "Swaps" },
  spent: { cs: "Útrata", en: "Spent" },
  parts: { cs: "dílů", en: "parts" },
  servicesLower: { cs: "servisů", en: "services" },
  updated: { cs: "Aktualizováno", en: "Updated" },
  updatedLower: { cs: "aktualizováno", en: "updated" },
  owner: { cs: "Vlastník", en: "Owner" },
  noPhoto: { cs: "bez fotky", en: "no photo" },
  seeBuild: { cs: "Prohlédnout osazení", en: "See the build" },
  serviceHistory: { cs: "Servisní historie", en: "Service history" },
  build: { cs: "Osazení", en: "The build" },
  buildIntro: (n: number, c: number): Pair => ({
    cs: `${n} kusů v ${c} kategoriích. Klepni na řádek a uvidíš, kdy byl díl namontovaný.`,
    en: `${n} parts across ${c} categories. Open a row to see when it was mounted.`,
  }),
  expandAll: { cs: "Rozbalit vše", en: "Expand all" },
  collapseAll: { cs: "Sbalit vše", en: "Collapse all" },
  mounted: { cs: "Namontováno", en: "Mounted" },
  sinceNew: { cs: "od nového kola", en: "since new" },
  setup: { cs: "Setup", en: "Setup" },
  currentSetup: { cs: "Aktuální", en: "Current" },
  frontTyre: { cs: "Přední plášť", en: "Front tyre" },
  rearTyre: { cs: "Zadní plášť", en: "Rear tyre" },
  fork: { cs: "Vidlice", en: "Fork" },
  forkSag: { cs: "Sag vidlice", en: "Fork sag" },
  sag: { cs: "sag", en: "sag" },
  shock: { cs: "Tlumič", en: "Shock" },
  shockSag: { cs: "Sag tlumiče", en: "Shock sag" },
  tokensAndClicks: {
    cs: "Tokeny a kliky (od plně zavřeného)",
    en: "Tokens and clicks (from fully closed)",
  },
  tokens: { cs: "Tokeny", en: "Tokens" },
  reboundLs: { cs: "Odskok LS", en: "Rebound LS" },
  reboundHs: { cs: "Odskok HS", en: "Rebound HS" },
  compressionLs: { cs: "Komprese LS", en: "Compression LS" },
  compressionHs: { cs: "Komprese HS", en: "Compression HS" },
  swap: { cs: "Výměna", en: "Swap" },
  showOlder: { cs: "Zobrazit starší", en: "Show older" },
  undated: { cs: "Datum neuvedeno", en: "Date not given" },
  footerNote: {
    cs: "Tenhle profil vede majitel v aplikaci BikeCheck. Stránka čte jeho garáž, jak stojí teď — když profil vypne, zmizí.",
    en: "The owner keeps this profile in the BikeCheck app. The page reads the garage as it stands now — switch the profile off and it is gone.",
  },
  startGarage: { cs: "Založit vlastní garáž", en: "Start your own garage" },
  // The one page every closed address opens (#116, #127).
  closedTitle: {
    cs: "Tenhle profil není veřejný",
    en: "This profile is not public",
  },
  closedBody: {
    cs: "Majitel ho vypnul, nechal jen pro sledující, nebo adresa neplatí. Zvenku se to nepozná — a tak to má být.",
    en: "The owner switched it off, kept it for followers, or the address is not in use. From outside there is no telling which — as intended.",
  },
  closedFollower: {
    cs: "Pokud ho sleduješ, otevři ho v aplikaci BikeCheck.",
    en: "If you follow them, open it in the BikeCheck app.",
  },
  openInApp: { cs: "Otevřít v aplikaci", en: "Open in the app" },
} as const;

// #127: the app's listing, not a custom scheme — Play shows Open or Install by itself.
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.bikecheck.app";

// The mock stores relative "updated" phrases in Czech; the page needs them in English too.
const UPDATED_EN: Record<string, string> = {
  "právě teď": "just now",
  včera: "yesterday",
  "před 3 dny": "3 days ago",
  "před 8 dny": "8 days ago",
  "před 2 týdny": "2 weeks ago",
  "před 5 týdny": "5 weeks ago",
  "před měsícem": "a month ago",
};

export function updatedLabel(lang: PublicLang, updated: string): string {
  return lang === "cs" ? updated : (UPDATED_EN[updated] ?? updated);
}

// Catalogue names live in the mock as the owner's Czech; the real page reads i18n_key and
// translates through useSeededName (#118). Anything unmapped shows as written.
const CATALOGUE_EN: Record<string, string> = {
  Odpružení: "Suspension",
  Rám: "Frame",
  Kokpit: "Cockpit",
  "Sedlo a sedlovka": "Saddle & seatpost",
  Kola: "Wheels",
  Pohon: "Drivetrain",
  Brzdy: "Brakes",
  Ostatní: "Other",
  Vidlice: "Fork",
  Tlumič: "Shock",
  Hanger: "Hanger",
  "Hlavové složení": "Headset",
  Představec: "Stem",
  Řídítka: "Handlebar",
  Gripy: "Grips",
  Sedlo: "Saddle",
  Sedlovka: "Seatpost",
  Ráfek: "Rim",
  Plášť: "Tire",
  Náboj: "Hub",
  Inserty: "Inserts",
  Tmel: "Sealant",
  "Řadicí páka": "Shifter",
  Přehazovačka: "Derailleur",
  Kliky: "Cranks",
  Převodník: "Chainring",
  Řetěz: "Chain",
  Kazeta: "Cassette",
  "Brzdové páky": "Brake levers",
  Kotouč: "Rotor",
  Destičky: "Pads",
  Pedály: "Pedals",
  "Středové složení": "Bottom bracket",
  Ventilky: "Valves",
  "Plášť přední": "Tire front",
  "Plášť zadní": "Tire rear",
  "Ráfek přední": "Rim front",
  "Ráfek zadní": "Rim rear",
  "Náboj zadní": "Hub rear",
  "Destičky přední": "Pads front",
  "Destičky zadní": "Pads rear",
  Přední: "Front",
  Zadní: "Rear",
  "Výměna dílu": "part swap",
  "Kontrola geometrie": "geometry check",
  "Doplnění tmelu": "sealant top-up",
  "Výměna oleje": "oil change",
  "Výměna prachovek": "seal change",
  Mazání: "lubrication",
  Seřízení: "adjustment",
  "Základní servis": "basic service",
  Centrování: "truing",
  Odvzdušnění: "bleed",
  Čištění: "cleaning",
  "Kontrola utažení": "torque check",
  "Výměna ložisek": "bearing replacement",
  "Voskování řetězu": "chain waxing",
  "Výměna destiček": "pad replacement",
  "od nového kola": "since new",
  "vel. L": "size L",
  "vel. M": "size M",
};

export function catalogue(lang: PublicLang, name: string): string {
  return lang === "cs" ? name : (CATALOGUE_EN[name] ?? name);
}
