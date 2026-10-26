import forms from "@tailwindcss/forms";

/** @type {import('tailwindcss').Config} */
export default {
  // The scripts toggle classes too, so they are scanned as well.
  content: ["./index.html", "./js/**/*.js"],
  theme: {
    extend: {
      colors: {
        // Derived from the brand mark: slate #22333B and gold #CEC053
        ink: { 950: "#0A0A0B", 900: "#101012", 850: "#17181A", 800: "#1F2023", 700: "#2C2E31", 600: "#43464A" },
        gold: { 300: "#E8DE93", 400: "#DED37A", 500: "#CEC053", 600: "#A69A3F", 700: "#7B722E" },
        paper: { DEFAULT: "#F2F2F1", dim: "#9C9C9E", faint: "#85868A" },
        sage: "#7FB069",
        rust: "#D08248",
      },
      // One face, as in the App (ADR 0043); "mono" is only a role name, figures align via tabular-nums.
      fontFamily: {
        display: ["Roboto", "system-ui", "sans-serif"],
        body: ["Roboto", "system-ui", "sans-serif"],
        mono: ["Roboto", "system-ui", "sans-serif"],
      },
      // 1360px of content inside the lg padding.
      maxWidth: { content: "1424px" },
    },
  },
  plugins: [forms],
};
