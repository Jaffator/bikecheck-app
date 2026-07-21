const fs = require("fs");
const path = require("path");
const potrace = require("potrace");

const inputDir = "../../_frontend/bikecheck/src/assets/icons/cropped_icons"; // Složka s tvými černobílými PNG
const outputDir = "../../_frontend/bikecheck/src/assets/icons/svg_icons"; // Složka, kam se uloží oříznuté PNG

// --- Normalizace: společný rám + live area pro celou sadu ikon ---
const CANVAS = 48; // společný viewBox (48x48)
const PADDING = 2; // okraj kolem obsahu
const LIVE = CANVAS - PADDING * 2; // živá plocha (20x20), do které se ikona fitne

const params = {
  background: "transparent",
  invert: false, // KLÍČOVÉ: Musí být TRUE. Tím řekneš, že chceš vektorizovat tu "díru" (vidlici)
  color: "#ffffff", // Barva výsledné vidlice
  blackOnWhite: false,
  threshold: 128,
};

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Zaokrouhlení na 3 desetinná místa, ať SVG není zaneřáděné dlouhými čísly.
function round(n) {
  return Math.round(n * 1000) / 1000;
}

// Vytáhne rozměr obsahu z potrace SVG (nejdřív viewBox, fallback width/height).
function getDimensions(svgTag) {
  const vb = svgTag.match(/viewBox="([\d.\s-]+)"/);
  if (vb) {
    const parts = vb[1].trim().split(/\s+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { w: parts[2], h: parts[3] };
    }
  }
  const wM = svgTag.match(/width="([\d.]+)/);
  const hM = svgTag.match(/height="([\d.]+)/);
  if (wM && hM) return { w: parseFloat(wM[1]), h: parseFloat(hM[1]) };
  return null;
}

// Fitne obsah potrace SVG do společné 24x24 live area (poměr stran zachován, vycentrováno).
// Předpoklad: vstupní obrázky jsou oříznuté natěsno k ikoně (proto content ~ viewBox).
function normalizeSvg(svg) {
  const tagMatch = svg.match(/<svg[^>]*>/);
  if (!tagMatch) return svg; // fallback: nevím rozměr, nechám být

  const dims = getDimensions(tagMatch[0]);
  if (!dims) return svg;

  // Obsah = vše mezi <svg ...> a </svg>. Souřadnice zůstávají v prostoru 0..w / 0..h.
  const inner = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .trim();

  const scale = LIVE / Math.max(dims.w, dims.h); // fitne delší stranu do live area
  const tx = PADDING + (LIVE - dims.w * scale) / 2; // vycentruje vodorovně
  const ty = PADDING + (LIVE - dims.h * scale) / 2; // vycentruje svisle

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
  <g transform="translate(${round(tx)} ${round(ty)}) scale(${round(scale)})">
    ${inner}
  </g>
</svg>
`;
}

fs.readdir(inputDir, (err, files) => {
  if (err) return console.error(err);

  files
    .filter((file) => path.extname(file).toLowerCase() === ".jpeg")
    .forEach((file) => {
      const inputPath = path.join(inputDir, file);
      const outputPath = path.join(outputDir, file.replace(".jpeg", ".svg"));

      potrace.trace(inputPath, params, (err, svg) => {
        if (err) {
          console.error(`Chyba při převodu ${file}:`, err);
          return;
        }
        const normalized = normalizeSvg(svg);
        fs.writeFileSync(outputPath, normalized);
        console.log(`Převedeno + normalizováno: ${file} -> SVG`);
      });
    });
});
