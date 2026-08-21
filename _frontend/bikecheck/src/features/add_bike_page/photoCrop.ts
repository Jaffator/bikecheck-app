// Cutting a picked photo down to the frame the app shows it in.
import type { Area } from "react-easy-crop";

// Match the crop ratio to the bike photo slot.
export const PHOTO_ASPECT = 2;

// Cap output width to balance quality and upload size.
const OUTPUT_WIDTH = 1600;
// Use canvas-compatible JPEG output.
const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.9;

// Decode the image before drawing its crop.
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
    // Release the object URL after image decoding.
    URL.revokeObjectURL(url);
  }
}

// Crop source pixels into an upload-ready file.
export async function cropToFile(file: File, area: Area): Promise<File> {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  // Avoid enlarging crops beyond their source detail.
  const width = Math.min(OUTPUT_WIDTH, Math.round(area.width));
  canvas.width = width;
  canvas.height = Math.round(width / PHOTO_ASPECT);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("The photo could not be processed");

  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, OUTPUT_TYPE, OUTPUT_QUALITY);
  });
  if (!blob) throw new Error("The photo could not be processed");

  // Keeps the original name so the upload still reads as the user's own file.
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: OUTPUT_TYPE });
}

// Share a consistent bike photo slot height.
export const PHOTO_SLOT_HEIGHT = 180;
