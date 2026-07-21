const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const inputDir = "../../_frontend/bikecheck/src/assets/icons/cropped_icons"; // Složka s tvými černobílými PNG
const outputDir = "../../_frontend/bikecheck/src/assets/icons/cropped_icons2"; // Složka, kam se uloží oříznuté PNG

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

fs.readdir(inputDir, (err, files) => {
  if (err) return console.error(err);

  files
    .filter((file) => path.extname(file).toLowerCase() === ".jpeg")
    .forEach(async (file) => {
      const inputPath = path.join(inputDir, file);
      const outputPath = path.join(outputDir, file);

      try {
        await sharp(inputPath)
          .trim() // <--- KLÍČOVÉ: Automaticky ořízne jednobarevné pozadí
          .toFile(outputPath);

        console.log(`Oříznuto na těsno: ${file}`);
      } catch (error) {
        console.error(`Chyba u ${file}:`, error);
      }
    });
});
