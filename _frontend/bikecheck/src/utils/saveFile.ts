// Long enough for the browser to have started the download.
const OBJECT_URL_LIFETIME_MS = 60_000;

// Hands a file already in memory to the browser's own download.
export function saveFile(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), OBJECT_URL_LIFETIME_MS);
}
