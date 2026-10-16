import { authCookieOptions } from './auth-cookies';

describe('authCookieOptions', () => {
  const nodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = nodeEnv;
  });

  it('lets the Android App keep its cookies across sites', () => {
    expect(authCookieOptions('https://localhost')).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });
  });

  it('keeps a request with no Origin on Lax', () => {
    expect(authCookieOptions(undefined)).toEqual({ httpOnly: true, secure: false, sameSite: 'lax', path: '/' });
  });

  it('keeps the web on Lax, Secure in production', () => {
    process.env.NODE_ENV = 'production';

    expect(authCookieOptions('https://app.bikecheck.cloud')).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
  });

  // Only the WebView's exact origin: a dev server on another scheme or port is same-origin through its proxy.
  it.each(['http://localhost', 'https://localhost:5173', 'https://localhost.evil.test'])(
    'keeps %s on Lax',
    (origin) => {
      expect(authCookieOptions(origin).sameSite).toBe('lax');
    },
  );
});
