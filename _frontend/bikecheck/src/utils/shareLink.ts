import { Capacitor } from "@capacitor/core";
import { Clipboard } from "@capacitor/clipboard";
import { Share } from "@capacitor/share";

// What a Share Link is handed to the system as. The title is the kind of document, the
// text says which bike it is about, and the url is the link itself.
export interface SharedLink {
  title: string;
  text: string;
  url: string;
}

// Takes a Share Link to the clipboard. The device goes through the native plugin because
// the WebView is served over http, where `navigator.clipboard` does not exist at all.
export async function copyLink(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Clipboard.write({ string: url });
    return;
  }

  await navigator.clipboard.writeText(url);
}

// Whether this device has a share sheet to hand a link to. A device always does; a browser
// only when it implements the Web Share API.
export function canShareLink(): boolean {
  return Capacitor.isNativePlatform() || (typeof navigator !== "undefined" && typeof navigator.share === "function");
}

// Hands the link to the system share sheet — WhatsApp, mail, whatever the device offers.
export async function shareLink(link: SharedLink): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Share.share({ title: link.title, text: link.text, url: link.url });
    return;
  }

  await navigator.share({ title: link.title, text: link.text, url: link.url });
}
