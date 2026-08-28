// How an attachment names itself before it is opened.
import type { ServiceAttachment } from "./service.types";

const PDF_TYPE = "application/pdf";
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;

// The kind of file, in the user's language. The stored type is all we have to go on, and
// the two kinds the upload accepts are the only two worth naming.
export function attachmentTypeLabel(attachment: ServiceAttachment, translate: (key: string) => string): string {
  if (attachment.content_type === PDF_TYPE) return translate("service.fileType.pdf");
  if (attachment.content_type?.startsWith("image/")) return translate("service.fileType.image");
  return translate("service.fileType.file");
}

// A weight the eye can read: 640 kB, 1,2 MB. Written the way the user's language writes
// numbers, so a Czech reader sees the comma they expect.
export function formatFileSize(bytes: number, language: string): string {
  if (bytes < BYTES_PER_MB) {
    const kilobytes = Math.max(1, Math.round(bytes / BYTES_PER_KB));
    return `${new Intl.NumberFormat(language).format(kilobytes)} kB`;
  }
  const megabytes = bytes / BYTES_PER_MB;
  return `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(megabytes)} MB`;
}

// The line under the file name. Attachments stored before the size was recorded carry
// none, and then the type stands alone rather than a weight being invented for it.
export function attachmentSubtitle(
  attachment: ServiceAttachment,
  language: string,
  translate: (key: string) => string,
): string {
  const type = attachmentTypeLabel(attachment, translate);
  const size = attachment.size_bytes;
  return size === null || size === undefined ? type : `${type} · ${formatFileSize(size, language)}`;
}
