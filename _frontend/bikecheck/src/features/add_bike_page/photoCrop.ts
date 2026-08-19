// Cutting a picked photo down to the frame the app shows it in.
import type { Area } from "react-easy-crop";

// The card's photo slot is the full card width at 180px tall — about 2:1 on a
// phone. Framing to that shape is what stops the card from having to choose
// which part of the photo to drop.
export const PHOTO_ASPECT = 2;

// Wider than any slot draws, so the crop still has pixels to spare on a large
// screen, and small enough that the upload is not the original megabytes.
const OUTPUT_WIDTH = 1600;
// WebP would be re-encoded by the backend anyway; JPEG is what every browser
// can produce from a canvas.
const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.9;

// Canvas needs a decoded image, and decoding is asynchronous — the crop cannot
// be drawn until the source has loaded.
async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The photo could not be read"));
      image.src = url;
    });
    return image;
  } finally {
    // The decoded image keeps its own copy of the pixels, so the URL has done
    // its job either way.
    URL.revokeObjectURL(url);
  }
}

// Cuts the framed area out of the original and hands back a file the existing
// upload can send unchanged. The area arrives in the source image's own pixels,
// which is what drawImage takes.
export async function cropToFile(file: File, area: Area): Promise<File> {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  // A crop of a small photo must not be upscaled into a bigger file than it has
  // detail for.
  const width = Math.min(OUTPUT_WIDTH, Math.round(area.width));
  canvas.width = width;
  canvas.height = Math.round(width / PHOTO_ASPECT);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("The photo could not be processed");

  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, OUTPUT_TYPE, OUTPUT_QUALITY);
  });
  if (!blob) throw new Error("The photo could not be processed");

  // Keeps the original name so the upload still reads as the user's own file.
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: OUTPUT_TYPE });
}

// The height every bike photo slot draws at. Card and detail share it so a
// photo cropped for one is not letterboxed by the other.
export const PHOTO_SLOT_HEIGHT = 180;
