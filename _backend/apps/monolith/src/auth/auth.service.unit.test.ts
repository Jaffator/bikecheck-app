import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { getLoggerToken } from 'nestjs-pino';
import { RefreshTokenService } from '../refreshtoken/refreshtoken.service';
import { TokenService } from './token.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';

describe('AuthService_testing', () => {
  let authService: AuthService;
  const mockUserService = {
    getUserbyEmail: jest.fn(),
    getUserbyId: jest.fn(),
    updatePassword: jest.fn(),
    registerLocal: jest.fn(),
    verifyEmail: jest.fn(),
  };
  const mockRefreshTokenService = {
    revokeToken: jest.fn(() => {}),
    findByToken: jest.fn(() => {}),
    revokeAllUserTokensExcept: jest.fn(() => {}),
  };
  const mockTokenService = {
    mintVerificationToken: jest.fn(),
    readVerificationToken: jest.fn(),
  };
  const mockMailService = {
    sendVerificationEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
  };
  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: RefreshTokenService, useValue: mockRefreshTokenService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: MailService, useValue: mockMailService },
        { provide: getLoggerToken(AuthService.name), useValue: mockLogger },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('loginUserLocal', () => {
    // A verified row: the column is set, and the password decides.
    const verifiedAt = new Date('2026-01-01T00:00:00Z');

    // happy path
    it('Should return user if email and password correct', async () => {
      // ARRANGE
      const email = 'test@test.com';
      const password = 'password';
      const password_hash = await bcrypt.hash(password, 5);
      const user = { id: 1, email, password_hash, email_verified_at: verifiedAt };
      mockUserService.getUserbyEmail.mockResolvedValue(user);

      // ACT
      const result = await authService.loginUserLocal(email, password);
      // ASSERT
      expect(result).toEqual(user);
    });

    it('Should return null, user does not exist', async () => {
      // ARRANGE
      const email = 'test@test.com';
      const password = 'password';
      mockUserService.getUserbyEmail.mockResolvedValue(null);

      // ACT
      const result = await authService.loginUserLocal(email, password);
      // ASSERT
      expect(result).toBeNull();
    });

    it('Should return error, google account exist', async () => {
      // ARRANGE
      const email = 'test@test.com';
      const password = 'password';
      const password_hash = null;
      const googleId = '123';
      const user = { id: 1, email, password_hash, googleId, email_verified_at: verifiedAt };
      mockUserService.getUserbyEmail.mockResolvedValue(user);

      // ASSERT ACT
      await expect(authService.loginUserLocal(email, password)).rejects.toThrow(UnauthorizedException);
    });

    // An Unverified Account cannot sign in (ADR 0031). The password is checked first, so
    // the 403 never tells someone who does not know it that a placeholder exists.
    describe('on an Unverified Account', () => {
      const email = 'test@test.com';
      const password = 'password';

      it('answers 401 to a wrong password, as for any account', async () => {
        const password_hash = await bcrypt.hash(password, 5);
        mockUserService.getUserbyEmail.mockResolvedValue({ id: 1, email, password_hash, email_verified_at: null });

        const result = await authService.loginUserLocal(email, 'wrong-password');

        expect(result).toBeNull();
      });

      it('answers 403 EMAIL_NOT_VERIFIED to the right password', async () => {
        const password_hash = await bcrypt.hash(password, 5);
        mockUserService.getUserbyEmail.mockResolvedValue({ id: 1, email, password_hash, email_verified_at: null });

        await expect(authService.loginUserLocal(email, password)).rejects.toThrow(ForbiddenException);
        await expect(authService.loginUserLocal(email, password)).rejects.toThrow('EMAIL_NOT_VERIFIED');
      });
    });
  });

  // Registration ends on "check your inbox": the row is written, the Verification Email
  // goes out with the link, and the answer names the address and nothing else.
  describe('registerLocal', () => {
    const dto = { name: 'Jarda', email: 'rider@example.com', password: 'abcd1234', language: 'cs' };
    const user = { id: 7, email: dto.email, name: dto.name, language: 'cs', email_verified_at: null };
    const publicAppUrl = process.env.PUBLIC_APP_URL;

    beforeEach(() => {
      process.env.PUBLIC_APP_URL = 'https://app.example.com/';
      mockUserService.registerLocal.mockResolvedValue(user);
      mockTokenService.mintVerificationToken.mockReturnValue('signed.jwt.token');
      mockMailService.sendVerificationEmail.mockResolvedValue(undefined);
    });

    afterAll(() => {
      process.env.PUBLIC_APP_URL = publicAppUrl;
    });

    it('answers with the address only - no user, no session', async () => {
      const result = await authService.registerLocal(dto);

      expect(result).toEqual({ email: dto.email });
    });

    it('sends the Verification Email to the row with a link carrying the minted token', async () => {
      await authService.registerLocal(dto);

      expect(mockTokenService.mintVerificationToken).toHaveBeenCalledWith(user);
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalledWith(
        user,
        'https://app.example.com/verify-email?token=signed.jwt.token',
      );
    });

    it('sends no Welcome Email - the account is a placeholder', async () => {
      await authService.registerLocal(dto);

      expect(mockMailService.sendWelcomeEmail).not.toHaveBeenCalled();
    });

    // Create and replace look the same from here: whatever UserService returned is what
    // gets the email. A refusal from UserService passes through and sends nothing.
    it('lets a refusal from UserService through and sends nothing', async () => {
      mockUserService.registerLocal.mockRejectedValue(new BadRequestException('x'));

      await expect(authService.registerLocal(dto)).rejects.toThrow(BadRequestException);
      expect(mockMailService.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  // The link verifies (ADR 0031): the token names a row and an address, the row flips
  // once, the Welcome Email goes with that one flip. Every refusal is the one code, so the
  // page has nothing to tell apart; a link used twice reads as success both times.
  describe('verifyEmail', () => {
    const token = 'signed.jwt.token';
    const payload = { purpose: 'email_verification', sub: 7, email: 'rider@example.com' };
    const unverified = { id: 7, email: 'rider@example.com', name: 'Jarda', language: 'cs', email_verified_at: null };
    const verified = { ...unverified, email_verified_at: new Date('2026-01-01T00:00:00Z') };

    beforeEach(() => {
      mockTokenService.readVerificationToken.mockReturnValue(payload);
      mockUserService.getUserbyId.mockResolvedValue(unverified);
      mockUserService.verifyEmail.mockResolvedValue(true);
      mockMailService.sendWelcomeEmail.mockResolvedValue(undefined);
    });

    it('flips an Unverified Account and answers with the address only', async () => {
      const result = await authService.verifyEmail(token);

      expect(mockTokenService.readVerificationToken).toHaveBeenCalledWith(token);
      expect(mockUserService.verifyEmail).toHaveBeenCalledWith(7);
      expect(result).toEqual({ email: 'rider@example.com' });
    });

    it('sends the Welcome Email to the row, once, at the transition', async () => {
      await authService.verifyEmail(token);

      expect(mockMailService.sendWelcomeEmail).toHaveBeenCalledTimes(1);
      expect(mockMailService.sendWelcomeEmail).toHaveBeenCalledWith(unverified);
    });

    // Already verified: nothing is written and nobody is greeted again, but the answer is
    // the same success - a second tap on the link must never read as an error.
    it('reads as success the second time, writes nothing and sends nothing', async () => {
      mockUserService.getUserbyId.mockResolvedValue(verified);

      const result = await authService.verifyEmail(token);

      expect(result).toEqual({ email: 'rider@example.com' });
      expect(mockUserService.verifyEmail).not.toHaveBeenCalled();
      expect(mockMailService.sendWelcomeEmail).not.toHaveBeenCalled();
    });

    // Two taps at once both read an unverified row; the conditional write says which one
    // made the transition, and only that one greets.
    it('sends no Welcome Email when another tap made the transition first', async () => {
      mockUserService.verifyEmail.mockResolvedValue(false);

      const result = await authService.verifyEmail(token);

      expect(result).toEqual({ email: 'rider@example.com' });
      expect(mockMailService.sendWelcomeEmail).not.toHaveBeenCalled();
    });

    describe('refuses with the one code', () => {
      afterEach(() => {
        expect(mockUserService.verifyEmail).not.toHaveBeenCalled();
        expect(mockMailService.sendWelcomeEmail).not.toHaveBeenCalled();
      });

      // Signature, expiry and purpose are the token reader's to refuse; its refusal passes
      // through untouched.
      it('an invalid, expired or wrong-purpose token', async () => {
        mockTokenService.readVerificationToken.mockImplementation(() => {
          throw new BadRequestException('VERIFICATION_TOKEN_INVALID');
        });

        await expect(authService.verifyEmail(token)).rejects.toThrow('VERIFICATION_TOKEN_INVALID');
        expect(mockUserService.getUserbyId).not.toHaveBeenCalled();
      });

      it('a token naming no row', async () => {
        mockUserService.getUserbyId.mockResolvedValue(null);

        await expect(authService.verifyEmail(token)).rejects.toThrow(BadRequestException);
        await expect(authService.verifyEmail(token)).rejects.toThrow('VERIFICATION_TOKEN_INVALID');
      });

      // A link minted for one placeholder must not verify a row that has since been
      // replaced under another address.
      it("a token whose address differs from the row's", async () => {
        mockUserService.getUserbyId.mockResolvedValue({ ...unverified, email: 'someone-else@example.com' });

        await expect(authService.verifyEmail(token)).rejects.toThrow(BadRequestException);
        await expect(authService.verifyEmail(token)).rejects.toThrow('VERIFICATION_TOKEN_INVALID');
      });
    });
  });

  // "Send it again" (ADR 0031): a lost Verification Email is a tap away. Only an Unverified
  // Account gets one; a Verified Email and an unknown address get nothing - and the answer
  // is the same in every case, so the endpoint says nothing about who has an account.
  describe('resendVerificationEmail', () => {
    const email = 'rider@example.com';
    const unverified = { id: 7, email, name: 'Jarda', language: 'cs', email_verified_at: null };
    const verified = { ...unverified, email_verified_at: new Date('2026-01-01T00:00:00Z') };
    const publicAppUrl = process.env.PUBLIC_APP_URL;

    beforeEach(() => {
      process.env.PUBLIC_APP_URL = 'https://app.example.com/';
      mockTokenService.mintVerificationToken.mockReturnValue('signed.jwt.token');
      mockMailService.sendVerificationEmail.mockResolvedValue(undefined);
    });

    afterAll(() => {
      process.env.PUBLIC_APP_URL = publicAppUrl;
    });

    it('sends a fresh Verification Email to an Unverified Account', async () => {
      mockUserService.getUserbyEmail.mockResolvedValue(unverified);

      await authService.resendVerificationEmail(email);

      expect(mockUserService.getUserbyEmail).toHaveBeenCalledWith(email);
      expect(mockTokenService.mintVerificationToken).toHaveBeenCalledWith(unverified);
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalledWith(
        unverified,
        'https://app.example.com/verify-email?token=signed.jwt.token',
      );
    });

    it('sends nothing to a Verified Email', async () => {
      mockUserService.getUserbyEmail.mockResolvedValue(verified);

      await authService.resendVerificationEmail(email);

      expect(mockTokenService.mintVerificationToken).not.toHaveBeenCalled();
      expect(mockMailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('sends nothing to an unknown address', async () => {
      mockUserService.getUserbyEmail.mockResolvedValue(null);

      await authService.resendVerificationEmail(email);

      expect(mockTokenService.mintVerificationToken).not.toHaveBeenCalled();
      expect(mockMailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    // Nothing the caller can see tells the three apart: no throw, no value.
    it('answers the same whether the address is unverified, verified or unknown', async () => {
      mockUserService.getUserbyEmail.mockResolvedValueOnce(unverified);
      const forUnverified = await authService.resendVerificationEmail(email);
      mockUserService.getUserbyEmail.mockResolvedValueOnce(verified);
      const forVerified = await authService.resendVerificationEmail(email);
      mockUserService.getUserbyEmail.mockResolvedValueOnce(null);
      const forUnknown = await authService.resendVerificationEmail(email);

      expect(forUnverified).toBeUndefined();
      expect(forVerified).toBeUndefined();
      expect(forUnknown).toBeUndefined();
    });

    it('never sends a Welcome Email - resending proves nothing', async () => {
      mockUserService.getUserbyEmail.mockResolvedValue(unverified);

      await authService.resendVerificationEmail(email);

      expect(mockMailService.sendWelcomeEmail).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    // happy path
    it('Should store the new password and revoke every other session', async () => {
      // ARRANGE
      const currentPassword = 'oldPassword123';
      const newPassword = 'newPassword123';
      const password_hash = await bcrypt.hash(currentPassword, 5);
      mockUserService.getUserbyId.mockResolvedValue({ id: 1, email: 'test@test.com', password_hash });

      // ACT
      await authService.changePassword(1, currentPassword, newPassword, 'current-refresh-token');

      // ASSERT
      expect(mockUserService.updatePassword).toHaveBeenCalledWith(1, newPassword);
      expect(mockRefreshTokenService.revokeAllUserTokensExcept).toHaveBeenCalledWith(1, 'current-refresh-token');
    });

    it('Should throw 401 and change nothing when the current password is wrong', async () => {
      // ARRANGE
      const password_hash = await bcrypt.hash('oldPassword123', 5);
      mockUserService.getUserbyId.mockResolvedValue({ id: 1, email: 'test@test.com', password_hash });

      // ACT ASSERT
      await expect(authService.changePassword(1, 'wrongPassword', 'newPassword123', 'token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUserService.updatePassword).not.toHaveBeenCalled();
      expect(mockRefreshTokenService.revokeAllUserTokensExcept).not.toHaveBeenCalled();
    });

    it('Should throw 400 when the account has no password (Google sign-in)', async () => {
      // ARRANGE
      mockUserService.getUserbyId.mockResolvedValue({ id: 1, email: 'test@test.com', password_hash: null });

      // ACT ASSERT
      await expect(authService.changePassword(1, 'anything', 'newPassword123', 'token')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserService.updatePassword).not.toHaveBeenCalled();
    });

    it('Should throw 401 when the user does not exist', async () => {
      // ARRANGE
      mockUserService.getUserbyId.mockResolvedValue(null);

      // ACT ASSERT
      await expect(authService.changePassword(1, 'oldPassword123', 'newPassword123', 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('Should revoke every session when the request carries no refresh token', async () => {
      // ARRANGE
      const currentPassword = 'oldPassword123';
      const password_hash = await bcrypt.hash(currentPassword, 5);
      mockUserService.getUserbyId.mockResolvedValue({ id: 1, email: 'test@test.com', password_hash });

      // ACT
      await authService.changePassword(1, currentPassword, 'newPassword123', null);

      // ASSERT
      expect(mockRefreshTokenService.revokeAllUserTokensExcept).toHaveBeenCalledWith(1, null);
    });
  });

  describe('logout', () => {
    it('should call revoke fnc', async () => {
      // ARRANGE
      const refresh_token = 'abc';

      // ACT
      await authService.logout(refresh_token);

      // ASSSERT
      expect(mockRefreshTokenService.revokeToken).toHaveBeenCalled();
    });
  });
});
