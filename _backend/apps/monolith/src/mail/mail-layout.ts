// The one HTML frame every email is set in: dark card, the logo, a title, a line or two,
// and a button. Tables and inline styles only - that is all mail clients agree on.

// The app's palette, as hex: mail clients know no CSS variables.
const BACKGROUND = '#141414';
const CARD = '#1f1f1f';
const TEXT = '#f4f4f5';
const TEXT_DIM = '#aeaeae';
const PRIMARY = '#cec053';

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export interface MailLayoutInput {
  // Null when the app's origin is unknown; the wordmark is then set in text.
  logoUrl: string | null;
  title: string;
  // Already escaped where it carries user text.
  body: string;
  button?: { label: string; href: string };
  // Small print under the button - the raw link, for a client that blocks buttons.
  footnote?: string;
}

// Only the logo needs a hosted image; Gmail and Outlook show neither SVG nor base64.
// Mail clients fetch it from their own servers, so it lives in R2, not on the app's origin.
export const MAIL_LOGO_KEY = 'logo-mail.png';

export function mailLogoUrl(): string | null {
  const origin = process.env.CLOUDFLARE_PUBLIC_URL;
  if (origin === undefined || origin === '') return null;
  return `${origin.replace(/\/+$/, '')}/static/${MAIL_LOGO_KEY}`;
}

export function renderMail({ logoUrl, title, body, button, footnote }: MailLayoutInput): string {
  const logo =
    logoUrl === null
      ? `<span style="font-size:22px;font-weight:700;color:${TEXT};letter-spacing:-0.3px;">BikeCheck</span>`
      : `<img src="${logoUrl}" alt="BikeCheck" width="160" style="display:block;width:160px;height:auto;border:0;" />`;

  // Outlined, not filled: Gmail's dark mode repaints dark text white, but leaves the yellow alone.
  const cta =
    button === undefined
      ? ''
      : `<tr><td style="padding:8px 0 24px 0;">
          <a href="${button.href}" style="display:inline-block;background:${BACKGROUND};border:2px solid ${PRIMARY};color:${PRIMARY};font-family:${FONT};font-size:15px;font-weight:700;text-decoration:none;padding:12px 26px;border-radius:12px;">${button.label}</a>
        </td></tr>`;

  const note =
    footnote === undefined
      ? ''
      : `<tr><td style="font-family:${FONT};font-size:12px;line-height:18px;color:${TEXT_DIM};word-break:break-all;">${footnote}</td></tr>`;

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:${BACKGROUND};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BACKGROUND};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${CARD};border-radius:16px;">
      <tr><td style="padding:32px 32px 8px 32px;">${logo}</td></tr>
      <tr><td style="padding:24px 32px 0 32px;font-family:${FONT};font-size:22px;line-height:28px;font-weight:700;color:${TEXT};">${title}</td></tr>
      <tr><td style="padding:12px 32px 24px 32px;font-family:${FONT};font-size:15px;line-height:24px;color:${TEXT_DIM};">${body}</td></tr>
      <tr><td style="padding:0 32px 32px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0">${cta}${note}</table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
