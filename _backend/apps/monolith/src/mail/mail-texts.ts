import { resolveLanguage, type NotificationLanguage } from '../notification/notification-texts';

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

// The Verification Email: one sentence, one link, and that it expires in a day. Nothing
// else, so there is no doubt about what to do with it.
const VERIFICATION: Record<MailLanguage, (link: string) => MailText> = {
  cs: (link) => ({
    subject: 'Ověř svůj e-mail',
    text: `Ověř svou adresu otevřením tohoto odkazu: ${link}\n\nOdkaz platí jeden den.`,
    html: `<p>Ověř svou adresu otevřením tohoto odkazu: <a href="${link}">${link}</a></p><p>Odkaz platí jeden den.</p>`,
  }),
  en: (link) => ({
    subject: 'Verify your email',
    text: `Verify your address by opening this link: ${link}\n\nThe link expires in a day.`,
    html: `<p>Verify your address by opening this link: <a href="${link}">${link}</a></p><p>The link expires in a day.</p>`,
  }),
};

// The Welcome Email: a greeting by name and one line on what the app does. No marketing.
const WELCOME: Record<MailLanguage, (name: string) => MailText> = {
  cs: (name) => ({
    subject: 'Vítej v BikeCheck',
    text: `Ahoj ${name},\n\nBikeCheck hlídá opotřebení dílů na tvém kole a připomene servis dřív, než něco odejde.`,
    html: `<p>Ahoj ${escapeHtml(name)},</p><p>BikeCheck hlídá opotřebení dílů na tvém kole a připomene servis dřív, než něco odejde.</p>`,
  }),
  en: (name) => ({
    subject: 'Welcome to BikeCheck',
    text: `Hi ${name},\n\nBikeCheck tracks the wear on your bike's parts and reminds you to service them before they give out.`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>BikeCheck tracks the wear on your bike's parts and reminds you to service them before they give out.</p>`,
  }),
};

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
