import { buildVerificationMail, buildWelcomeMail } from './mail-texts';

const LINK = 'https://app.example.com/verify-email?token=abc.def.ghi';

// Both languages render the three parts, and the link is in every part a client might
// show - a plain-text reader gets the same way in as an HTML one.
describe('Verification Email text', () => {
  it.each(['cs', 'en'])('renders subject, text and HTML carrying the link in %s', (language) => {
    const mail = buildVerificationMail(language, LINK);

    expect(mail.subject.length).toBeGreaterThan(0);
    expect(mail.text).toContain(LINK);
    expect(mail.html).toContain(`href="${LINK}"`);
  });

  it('reads in Czech for cs', () => {
    expect(buildVerificationMail('cs', LINK).subject).toBe('Ověř svůj e-mail');
  });

  it('reads in English for en', () => {
    expect(buildVerificationMail('en', LINK).subject).toBe('Verify your email');
  });

  it('says the link expires in a day', () => {
    expect(buildVerificationMail('en', LINK).text).toMatch(/expires in a day/);
    expect(buildVerificationMail('cs', LINK).text).toMatch(/jeden den/);
  });

  it.each([null, 'de', ''])('falls back to English for %p', (language) => {
    expect(buildVerificationMail(language, LINK).subject).toBe('Verify your email');
  });
});

describe('Welcome Email text', () => {
  it.each(['cs', 'en'])('greets the rider by name in %s', (language) => {
    const mail = buildWelcomeMail(language, 'Jarda');

    expect(mail.subject.length).toBeGreaterThan(0);
    expect(mail.text).toContain('Jarda');
    expect(mail.html).toContain('Jarda');
  });

  it('reads in Czech for cs', () => {
    expect(buildWelcomeMail('cs', 'Jarda').subject).toBe('Vítej v BikeCheck');
  });

  it('falls back to English for an unknown language', () => {
    expect(buildWelcomeMail('fr', 'Jarda').subject).toBe('Welcome to BikeCheck');
  });

  // A name the rider typed goes into HTML as text, never as markup.
  it('escapes the name in HTML', () => {
    const mail = buildWelcomeMail('en', '<b>Jarda</b>');

    expect(mail.html).not.toContain('<b>Jarda</b>');
    expect(mail.html).toContain('&lt;b&gt;Jarda&lt;/b&gt;');
  });

  it('still greets when the account has no name', () => {
    const mail = buildWelcomeMail('en', null);

    expect(mail.text.length).toBeGreaterThan(0);
    expect(mail.text).not.toContain('null');
  });
});
