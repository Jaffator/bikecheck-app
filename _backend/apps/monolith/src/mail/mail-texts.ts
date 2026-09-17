import { resolveLanguage, type NotificationLanguage } from '../notification/notification-texts';
import { mailLogoUrl, renderMail } from './mail-layout';

// The same two languages the app ships, resolved the same way: anything else falls back
// to English.
type MailLanguage = NotificationLanguage;

// One email as the provider takes it: a subject, a plain-text body for readers that show
// nothing else, and an HTML body carrying the same words.
export interface MailText {
  subject: string;
  text: string;
  html: string;
}

// The Verification Email: one sentence, one button, and that it expires in a day. The raw
// link sits under the button for a client that shows no buttons; plain text carries it alone.
const VERIFICATION: Record<MailLanguage, (link: string) => MailText> = {
  cs: (link) => ({
    subject: 'Ověř svůj e-mail',
    text: `Ověř svou adresu otevřením tohoto odkazu: ${link}\n\nOdkaz platí jeden den.`,
    html: renderMail({
      logoUrl: mailLogoUrl(),
      title: 'Ověř svůj e-mail',
      body: 'Klikni na tlačítko a je hotovo. Odkaz platí jeden den.',
      button: { label: 'Ověřit e-mail', href: link },
      footnote: `Nejde tlačítko? Zkopíruj odkaz: <a href="${link}" style="color:#aeaeae;">${link}</a>`,
    }),
  }),
  en: (link) => ({
    subject: 'Verify your email',
    text: `Verify your address by opening this link: ${link}\n\nThe link expires in a day.`,
    html: renderMail({
      logoUrl: mailLogoUrl(),
      title: 'Verify your email',
      body: 'Tap the button and you are done. The link expires in a day.',
      button: { label: 'Verify email', href: link },
      footnote: `Button not working? Copy the link: <a href="${link}" style="color:#aeaeae;">${link}</a>`,
    }),
  }),
};

// The Welcome Email: a greeting by name and one line on what the app does. No marketing.
const WELCOME: Record<MailLanguage, (name: string) => MailText> = {
  cs: (name) => ({
    subject: 'Vítej v BikeCheck',
    text: `Ahoj ${name},\n\nBikeCheck umožňuje chytře sledovat servis tvých kol a sdílet tvůj build s ostatními.`,
    html: renderMail({
      logoUrl: mailLogoUrl(),
      title: `Ahoj ${escapeHtml(name)},`,
      body: 'BikeCheck umožňuje chytře sledovat servis tvých kol a sdílet tvůj build s ostatními.',
      button: appButton('Otevřít BikeCheck'),
    }),
  }),
  en: (name) => ({
    subject: 'Welcome to BikeCheck',
    text: `Hi ${name},\n\nBikeCheck allows you to smartly track the service of your bikes and share your build with others.`,
    html: renderMail({
      logoUrl: mailLogoUrl(),
      title: `Hi ${escapeHtml(name)},`,
      body: 'BikeCheck allows you to smartly track the service of your bikes and share your build with others.',
      button: appButton('Open BikeCheck'),
    }),
  }),
};

// The way into the app, when its origin is known; no button otherwise.
function appButton(label: string): { label: string; href: string } | undefined {
  const origin = process.env.PUBLIC_APP_URL;
  return origin ? { label, href: origin.replace(/\/+$/, '') } : undefined;
}

// A greeting for an account that never gave a name, so "Hi null," is never written.
const NAMELESS: Record<MailLanguage, string> = { cs: 'jezdče', en: 'rider' };

export function buildVerificationMail(language: string | null, link: string): MailText {
  return VERIFICATION[resolveLanguage(language)](link);
}

export function buildWelcomeMail(language: string | null, name: string | null): MailText {
  const resolved = resolveLanguage(language);
  return WELCOME[resolved](name?.trim() || NAMELESS[resolved]);
}

// The name is the rider's own text and lands in HTML, so it goes in as text, not markup.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
