import { ActionIcon, Button, Drawer, SegmentedControl, createTheme, type MantineColorsTuple } from "@mantine/core";
import { CONTENT_MAX_WIDTH } from "./layout/contentWidth";

// Figma-derived ramps: shade 0 is lightest and shade 6 is the base value.
const primary: MantineColorsTuple = [
  "#fbfaf1",
  "#f4f0d7",
  "#ece7bc",
  "#e5dda2",
  "#ddd388",
  "#d6ca6d",
  "#cec053",
  "#a89d44",
  "#827a35",
  "#5d5625",
];
const secondary: MantineColorsTuple = [
  "#fdfaf8",
  "#f8f0eb",
  "#f4e7de",
  "#efddd1",
  "#ebd3c4",
  "#e6cab7",
  "#e2c0aa",
  "#b99d8b",
  "#8f7a6c",
  "#66564c",
];
const background: MantineColorsTuple = [
  "#f4f4f5",
  "#cbcbcb",
  "#aeaeae",
  "#969696",
  "#969696",
  "#868688",
  "#7e7e83",
  "#6c6c71",
  "#1f1f1f",
  "#141414",
];
// The dark end runs warm on purpose: the primary yellow and the Strava orange are both
// warm, so a cool grey card read as a different material behind them.
const cards: MantineColorsTuple = [
  "#ededed",
  "#cacaca",
  "#a7a7a7",
  "#848484",
  "#6b6764",
  "#313131",
  "#282828",
  "#1a1612",
  "#14100b",
  "#0f0c08",
];

const cards2: MantineColorsTuple = [
  "#ededed",
  "#cacaca",
  "#a7a7a7",
  "#848484",
  "#696058",
  "#2d2722",
  "#2d2d2d",
  "#171616",
  "#121111",
  "#0d0c0c",
];

const inputs: MantineColorsTuple = [
  "#ececec",
  "#c8c8c8",
  "#a4a4a4",
  "#808080",
  "#5c5c5c",
  "#39312a",
  "#191919",
  "#100d0b",
  "#0c0a08",
  "#0a0806",
];
const strava: MantineColorsTuple = [
  "#fff2ed",
  "#ffdacb",
  "#ffc1a8",
  "#ffa986",
  "#ff9064",
  "#ff7841",
  "#ff5f1f",
  "#d04e19",
  "#a23c14",
  "#732b0e",
];
const text: MantineColorsTuple = [
  "#fdfdfd",
  "#f8f8f8",
  "#f3f3f3",
  "#eeeeee",
  "#eaeaea",
  "#e5e5e5",
  "#e0e0e0",
  "#b7b7b7",
  "#8e8e8e",
  "#656565",
];
const textDark: MantineColorsTuple = [
  "#ebebeb",
  "#c5c5c5",
  "#9e9e9e",
  "#787878",
  "#525252",
  "#2b2b2b",
  "#050505",
  "#040404",
  "#030303",
  "#020202",
];

// Fixed single-value tokens from Figma that do not need a full ramp.
export const otherColor = {
  primaryLight: "#B8A937",
  primaryTrans: "rgba(147, 106, 59, 0.2)",
  textMuted: "#A8A29E",
  textBright: "#E4E2E2",
  textDim: "#CEC7BF",
  accent: "#B7C9D3",
  surface: "#2A241F",
  // 3.20:1 on a card, so a border can be the only thing outlining a control.
  borderSolid: "#757575",
  borderStrong: "rgba(255, 255, 255, 0.12)",
  borderSubtle: "rgba(255, 255, 255, 0.07)",
  statusIdle: "#FFB4AB",
  decor: "#352E28",
} as const;

// An outline without a colour is the quiet secondary: neutral frame and text on the card,
// the accent left to the icon. Button and ActionIcon prefix their vars differently.
function quietOutlineVars(prefix: "button" | "ai"): Record<string, string> {
  return {
    [`--${prefix}-bg`]: "var(--mantine-color-cards-7)",
    [`--${prefix}-bd`]: "1px solid var(--mantine-color-inputs-5)",
    [`--${prefix}-color`]: "var(--mantine-color-text-6)",
    [`--${prefix}-hover`]: "var(--mantine-color-cards-5)",
  };
}

export const theme = createTheme({
  autoContrast: true,
  primaryColor: "primary",
  primaryShade: 6,
  colors: {
    primary,
    secondary,
    background,
    cards,
    cards2,
    inputs,
    strava,
    text,
    textDark,
  },
  fontFamily: "Inter, sans-serif",
  // One family for headings and body: the card typography rule keeps Inter for names and
  // mono for data, so a third face had nowhere left to go.
  headings: {
    fontFamily: "Inter, sans-serif",
  },
  other: otherColor,
  respectReducedMotion: false,
  components: {
    // Disabled buttons sink into the card instead of Mantine's light-grey default.
    Button: Button.extend({
      // A coloured outline (red.5 delete) keeps its colour.
      vars: (_theme, props) => ({
        root: props.variant === "outline" && props.color === undefined ? quietOutlineVars("button") : {},
      }),
      styles: (_theme, props) => ({
        root: {
          "--mantine-color-disabled": "var(--mantine-color-cards-5)",
          "--mantine-color-disabled-color": "var(--mantine-color-text-8)",
          opacity: props.disabled ? 0.45 : undefined,
        } as React.CSSProperties,
      }),
    }),
    // The same quiet secondary on an icon-only button (the ✗ beside a request's ✓).
    ActionIcon: ActionIcon.extend({
      vars: (_theme, props) => ({
        root: props.variant === "outline" && props.color === undefined ? quietOutlineVars("ai") : {},
      }),
    }),
    // A bottom sheet stays over the content column in a browser instead of spanning the window.
    Drawer: Drawer.extend({
      styles: {
        content: { maxWidth: CONTENT_MAX_WIDTH, marginInline: "auto" },
      },
    }),
    // Every switch between a few words - Settings, the setup sheet - is drawn the same: sunk
    // track, raised pill, dim labels.
    SegmentedControl: SegmentedControl.extend({
      styles: {
        root: { backgroundColor: "var(--mantine-color-inputs-6)" },
        indicator: { backgroundColor: "var(--mantine-color-cards-5)" },
        label: { color: "var(--color-text-dim)" },
      },
    }),
  },
});
