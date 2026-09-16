import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { getLoggerToken } from 'nestjs-pino';
import { GoogleAuthService } from './googleAuth.service';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { MailService } from '../mail/mail.service';

// Google's own word on the address counts (ADR 0031). Three lookups in order - by Google id,
// by address, none - each split on whether Google vouches for the address and whether the
// row is verified. Every case says what was written, which email went out, and whether the
// rider was signed in or refused.
describe('GoogleAuthService googleLogin', () => {
  let service: GoogleAuthService;

  const mockUserService = {
    getUserbyGoogleId: jest.fn(),
    getUserbyEmail: jest.fn(),
    verifyEmail: jest.fn(),
    linkGoogleId: jest.fn(),
    takeOverPlaceholder: jest.fn(),
    createUserByGoogle: jest.fn(),
  };
  const mockAuthService = {
    sendVerificationEmail: jest.fn(),
  };
  const mockMailService = {
    sendWelcomeEmail: jest.fn(),
  };
  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const vouched = {
    googleId: 'google-123',
    email: 'rider@example.com',
    emailVerified: true,
    name: 'Jarda',
    avatar_url: 'https://example.com/a.png',
  };
  const unvouched = { ...vouched, emailVerified: false };

  const verifiedAt = new Date('2026-01-01T00:00:00Z');

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleAuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MailService, useValue: mockMailService },
        { provide: getLoggerToken(GoogleAuthService.name), useValue: mockLogger },
      ],
    }).compile();

    service = module.get<GoogleAuthService>(GoogleAuthService);

    mockUserService.getUserbyGoogleId.mockResolvedValue(null);
    mockUserService.getUserbyEmail.mockResolvedValue(null);
    mockUserService.verifyEmail.mockResolvedValue(true);
    mockAuthService.sendVerificationEmail.mockResolvedValue(undefined);
    mockMailService.sendWelcomeEmail.mockResolvedValue(undefined);
  });

  // Nothing was written to the row.
  function expectNothingWritten(): void {
    expect(mockUserService.verifyEmail).not.toHaveBeenCalled();
    expect(mockUserService.linkGoogleId).not.toHaveBeenCalled();
    expect(mockUserService.takeOverPlaceholder).not.toHaveBeenCalled();
    expect(mockUserService.createUserByGoogle).not.toHaveBeenCalled();
  }

  function expectNoEmail(): void {
    expect(mockAuthService.sendVerificationEmail).not.toHaveBeenCalled();
    expect(mockMailService.sendWelcomeEmail).not.toHaveBeenCalled();
  }

  describe('row found by Google id', () => {
    const verified = { id: 7, email: vouched.email, googleId: vouched.googleId, email_verified_at: verifiedAt };
    const placeholder = { ...verified, email_verified_at: null };

    // Verified: signed in as today, whatever Google says about the address this time.
    it.each([
      ['vouched', vouched],
      ['unvouched', unvouched],
    ])('verified, %s: signs in, writes nothing, sends nothing', async (_, dto) => {
      mockUserService.getUserbyGoogleId.mockResolvedValue(verified);

      const result = await service.googleLogin(dto);

      expect(result).toEqual({ user: verified, isNewUser: false });
      expectNothingWritten();
      expectNoEmail();
    });

    it('looks the Google id up first and never the address when it is found', async () => {
      mockUserService.getUserbyGoogleId.mockResolvedValue(verified);

      await service.googleLogin(vouched);

      expect(mockUserService.getUserbyGoogleId).toHaveBeenCalledWith(vouched.googleId);
      expect(mockUserService.getUserbyEmail).not.toHaveBeenCalled();
    });

    // A placeholder an unvouched sign-in left behind, vouched for now: verified here, greeted,
    // signed in as new.
    it('unverified, vouched: verifies, sends the Welcome Email, signs in as new', async () => {
      mockUserService.getUserbyGoogleId.mockResolvedValue(placeholder);

      const result = await service.googleLogin(vouched);

      expect(mockUserService.verifyEmail).toHaveBeenCalledWith(7);
      expect(mockMailService.sendWelcomeEmail).toHaveBeenCalledTimes(1);
      expect(mockMailService.sendWelcomeEmail).toHaveBeenCalledWith(placeholder);
      expect(mockAuthService.sendVerificationEmail).not.toHaveBeenCalled();
      expect(result).toEqual({ user: placeholder, isNewUser: true });
    });

    // Two sign-ins at once both read a placeholder; the conditional write says which one
    // made the transition, and only that one greets.
    it('unverified, vouched: sends no Welcome Email when another sign-in verified first', async () => {
      mockUserService.getUserbyGoogleId.mockResolvedValue(placeholder);
      mockUserService.verifyEmail.mockResolvedValue(false);

      const result = await service.googleLogin(vouched);

      expect(mockMailService.sendWelcomeEmail).not.toHaveBeenCalled();
      expect(result).toEqual({ user: placeholder, isNewUser: true });
    });

    it('unverified, unvouched: sends the Verification Email again and refuses', async () => {
      mockUserService.getUserbyGoogleId.mockResolvedValue(placeholder);

      await expect(service.googleLogin(unvouched)).rejects.toThrow(ForbiddenException);
      await expect(service.googleLogin(unvouched)).rejects.toThrow('EMAIL_NOT_VERIFIED');

      expect(mockAuthService.sendVerificationEmail).toHaveBeenCalledWith(placeholder);
      expect(mockMailService.sendWelcomeEmail).not.toHaveBeenCalled();
      expectNothingWritten();
    });
  });

  describe('row found by address', () => {
    const verified = {
      id: 7,
      email: vouched.email,
      googleId: null,
      name: 'Old Name',
      avatar_url: null,
      password_hash: 'hash',
      email_verified_at: verifiedAt,
    };
    const placeholder = { ...verified, name: 'Impostor', email_verified_at: null };

    it('verified, vouched: links the Google id and avatar, signs in', async () => {
      const linked = { ...verified, googleId: vouched.googleId, avatar_url: vouched.avatar_url };
      mockUserService.getUserbyEmail.mockResolvedValue(verified);
      mockUserService.linkGoogleId.mockResolvedValue(linked);

      const result = await service.googleLogin(vouched);

      expect(mockUserService.getUserbyEmail).toHaveBeenCalledWith(vouched.email);
      expect(mockUserService.linkGoogleId).toHaveBeenCalledWith(7, vouched);
      expect(mockUserService.takeOverPlaceholder).not.toHaveBeenCalled();
      expect(result).toEqual({ user: linked, isNewUser: false });
      expectNoEmail();
    });

    // The password is the way in; nothing is written, so an unvouched address cannot
    // attach a Google id to somebody's verified account.
    it('verified, unvouched: refuses with 409 GOOGLE_EMAIL_UNVERIFIED and writes nothing', async () => {
      mockUserService.getUserbyEmail.mockResolvedValue(verified);

      await expect(service.googleLogin(unvouched)).rejects.toThrow(ConflictException);
      await expect(service.googleLogin(unvouched)).rejects.toThrow('GOOGLE_EMAIL_UNVERIFIED');

      expectNothingWritten();
      expectNoEmail();
    });

    // The impostor's row never becomes the owner's: taken over outright and greeted.
    it('unverified, vouched: takes the placeholder over, sends the Welcome Email, signs in as new', async () => {
      const takenOver = {
        ...placeholder,
        googleId: vouched.googleId,
        name: vouched.name,
        avatar_url: vouched.avatar_url,
        password_hash: null,
        email_verified_at: new Date(),
      };
      mockUserService.getUserbyEmail.mockResolvedValue(placeholder);
      mockUserService.takeOverPlaceholder.mockResolvedValue(takenOver);

      const result = await service.googleLogin(vouched);

      expect(mockUserService.takeOverPlaceholder).toHaveBeenCalledWith(7, vouched);
      expect(mockUserService.linkGoogleId).not.toHaveBeenCalled();
      expect(mockUserService.verifyEmail).not.toHaveBeenCalled();
      expect(mockMailService.sendWelcomeEmail).toHaveBeenCalledTimes(1);
      expect(mockMailService.sendWelcomeEmail).toHaveBeenCalledWith(takenOver);
      expect(mockAuthService.sendVerificationEmail).not.toHaveBeenCalled();
      expect(result).toEqual({ user: takenOver, isNewUser: true });
    });

    // Lost the takeover race: the row is a Verified Email now, so it is met as one and the
    // winner's Welcome Email is not repeated.
    it('unverified, vouched: lost the takeover - re-reads, links the Google id, signs in, sends nothing', async () => {
      const nowVerified = { ...verified, googleId: null };
      const linked = { ...nowVerified, googleId: vouched.googleId, avatar_url: vouched.avatar_url };
      mockUserService.getUserbyEmail.mockResolvedValueOnce(placeholder).mockResolvedValueOnce(nowVerified);
      mockUserService.takeOverPlaceholder.mockResolvedValue(null);
      mockUserService.linkGoogleId.mockResolvedValue(linked);

      const result = await service.googleLogin(vouched);

      expect(mockUserService.takeOverPlaceholder).toHaveBeenCalledTimes(1);
      expect(mockUserService.getUserbyEmail).toHaveBeenCalledTimes(2);
      expect(mockUserService.linkGoogleId).toHaveBeenCalledWith(7, vouched);
      expect(result).toEqual({ user: linked, isNewUser: false });
      expectNoEmail();
    });

    // The row is gone altogether when read again: nobody has the address, so the sign-in
    // starts over as a new one.
    it('unverified, vouched: lost the takeover and the row is gone - creates anew', async () => {
      const created = { id: 9, ...vouched, email_verified_at: new Date() };
      mockUserService.getUserbyEmail.mockResolvedValueOnce(placeholder).mockResolvedValueOnce(null);
      mockUserService.takeOverPlaceholder.mockResolvedValue(null);
      mockUserService.createUserByGoogle.mockResolvedValue(created);

      const result = await service.googleLogin(vouched);

      expect(mockUserService.linkGoogleId).not.toHaveBeenCalled();
      expect(mockUserService.createUserByGoogle).toHaveBeenCalledWith(vouched);
      expect(result).toEqual({ user: created, isNewUser: true });
    });

    it('unverified, unvouched: puts the Google id on the placeholder, resends, refuses', async () => {
      const withGoogleId = { ...placeholder, googleId: unvouched.googleId };
      mockUserService.getUserbyEmail.mockResolvedValue(placeholder);
      mockUserService.linkGoogleId.mockResolvedValue(withGoogleId);

      await expect(service.googleLogin(unvouched)).rejects.toThrow(ForbiddenException);
      await expect(service.googleLogin(unvouched)).rejects.toThrow('EMAIL_NOT_VERIFIED');

      expect(mockUserService.linkGoogleId).toHaveBeenCalledWith(7, unvouched);
      expect(mockUserService.takeOverPlaceholder).not.toHaveBeenCalled();
      expect(mockUserService.verifyEmail).not.toHaveBeenCalled();
      expect(mockAuthService.sendVerificationEmail).toHaveBeenCalledWith(withGoogleId);
      expect(mockMailService.sendWelcomeEmail).not.toHaveBeenCalled();
    });
  });

  describe('no row', () => {
    it('vouched: creates a verified account, sends the Welcome Email, signs in as new', async () => {
      const created = { id: 9, ...vouched, email_verified_at: new Date() };
      mockUserService.createUserByGoogle.mockResolvedValue(created);

      const result = await service.googleLogin(vouched);

      expect(mockUserService.createUserByGoogle).toHaveBeenCalledWith(vouched);
      expect(mockMailService.sendWelcomeEmail).toHaveBeenCalledTimes(1);
      expect(mockMailService.sendWelcomeEmail).toHaveBeenCalledWith(created);
      expect(mockAuthService.sendVerificationEmail).not.toHaveBeenCalled();
      expect(result).toEqual({ user: created, isNewUser: true });
    });

    // A placeholder like any other: it carries the Google id, gets the link, and waits.
    it('unvouched: creates a placeholder with the Google id, sends the Verification Email, refuses', async () => {
      const created = { id: 9, ...unvouched, email_verified_at: null };
      mockUserService.createUserByGoogle.mockResolvedValue(created);

      await expect(service.googleLogin(unvouched)).rejects.toThrow(ForbiddenException);
      await expect(service.googleLogin(unvouched)).rejects.toThrow('EMAIL_NOT_VERIFIED');

      expect(mockUserService.createUserByGoogle).toHaveBeenCalledWith(unvouched);
      expect(mockAuthService.sendVerificationEmail).toHaveBeenCalledWith(created);
      expect(mockMailService.sendWelcomeEmail).not.toHaveBeenCalled();
    });
  });
});
