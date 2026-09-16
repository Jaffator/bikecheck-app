/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from './token.service';
import { RefreshTokenService } from '../refreshtoken/refreshtoken.service';
import { getLoggerToken } from 'nestjs-pino';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { users as UserFull } from '@prisma/client';

describe('TokenService_testing', () => {
  let tokenService: TokenService;
  let repo: RefreshTokenService;
  // Mocks
  const mockRepo = {
    findByToken: jest.fn(),
    revokeToken: jest.fn(),
    revokeAndCreateNew: jest.fn(),
    create: jest.fn(),
  };

  const mockUserService = {
    getUserbyId: jest.fn(),
  };
  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: RefreshTokenService, useValue: mockRepo },
        { provide: JwtService, useValue: { sign: () => 'fake-access-token' } },
        { provide: UserService, useValue: mockUserService },
        { provide: getLoggerToken(TokenService.name), useValue: mockLogger },
      ],
    }).compile();

    tokenService = module.get<TokenService>(TokenService);
    repo = module.get<RefreshTokenService>(RefreshTokenService);
  });
  describe('RefreshToken', () => {
    it('Should return new access token and reuse refresh token', async () => {
      // ARRANGE
      // Comfortably past the rotation threshold, so the token is reused as is.
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90); // + 90 days

      mockRepo.findByToken.mockResolvedValue({
        user_id: 1,
        revoked: false,
        expires_at: futureDate,
      });

      mockUserService.getUserbyId.mockResolvedValue({ id: 1, email: 'test@test.com' });

      // ACT
      const result = await tokenService.refreshToken('old_token', 'chrome', '127.0.0.0');

      // ASSERT
      expect(result.accessToken).toBe('fake-access-token');
      expect(result.refreshToken).toBe('old_token');
    });

    it('Should return error - refresh Token old', async () => {
      // ARRANGE
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() - 1); // + 5days

      mockRepo.findByToken.mockResolvedValue({
        user_id: 1,
        revoked: false,
        expires_at: futureDate,
      });

      mockUserService.getUserbyId.mockResolvedValue({ id: 1, email: 'test@test.com' });

      // ACT and  ASSERT
      await expect(tokenService.refreshToken('old_token', 'chrome', '127.0.0.0')).rejects.toThrow(
        UnauthorizedException,
      );
    });
    it('Should return error - refresh Token null | revoked', async () => {
      // ARRANGE
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() - 1); // + 5days

      mockRepo.findByToken.mockResolvedValue(null);

      mockUserService.getUserbyId.mockResolvedValue({ id: 1, email: 'test@test.com' });

      // ASEERT and ACT
      await expect(tokenService.refreshToken('old_token', 'chrome', '127.0.0.0')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('Refresh Token expiracy less then 24h left - create new one', async () => {
      // ARRANGE
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 23); // + 5days
      mockRepo.findByToken.mockResolvedValue({
        user_id: 1,
        revoked: false,
        expires_at: futureDate,
      });

      mockUserService.getUserbyId.mockResolvedValue({ id: 1, email: 'test@test.com' });
      mockRepo.revokeAndCreateNew.mockResolvedValue(undefined); // void - nic nevrací

      // ACT
      const result = await tokenService.refreshToken('old_token', 'chrome', '127.0.0.0');

      // ASSERT
      expect(mockRepo.revokeAndCreateNew).toHaveBeenCalled(); // byl zavolán
      expect(result.accessToken).toBe('fake-access-token');
      expect(result.refreshToken).not.toBe('old_token'); // nový refresh token byl vygenerován
    });
    it('Should throw UnauthorizedException when user not found', async () => {
      // ARRANGE
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      mockRepo.findByToken.mockResolvedValue({
        user_id: 999,
        revoked: false,
        expires_at: futureDate,
      });

      mockUserService.getUserbyId.mockResolvedValue(null); // user neexistuje

      // ACT & ASSERT
      await expect(tokenService.refreshToken('old_token', 'chrome', '127.0.0.0')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('createRefreshAndAccessTokens_fnc', () => {
    it('Return new access and refresh token', async () => {
      // ARRANGE
      const mockUser = { id: 1, email: 'test@test.com' } as UserFull;
      mockRepo.create.mockResolvedValue(undefined); // void - jen uloží do DB
      // ACT
      const result = await tokenService.createRefreshAndAccessTokens(mockUser, 'chrome', '127.0.0.0');
      // ASSERT
      expect(mockRepo.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('fake-access-token');
      expect(result.refreshToken).toBeDefined();
    });
  });
});

// The Verification Email carries a signed JWT, not a row (ADR 0031): purpose, user id,
// address, a day's expiry, the app's own secret. Read back with a real JwtService so the
// signature and the expiry are what is tested, not a mock of them.
describe('TokenService verification token', () => {
  let tokenService: TokenService;
  const jwtService = new JwtService({ secret: 'test-secret' });
  const user = { id: 7, email: 'rider@example.com' } as UserFull;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: RefreshTokenService, useValue: {} },
        { provide: JwtService, useValue: jwtService },
        { provide: UserService, useValue: {} },
        {
          provide: getLoggerToken(TokenService.name),
          useValue: { info: jest.fn(), debug: jest.fn(), warn: jest.fn() },
        },
      ],
    }).compile();

    tokenService = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reads back its purpose, user id and address', () => {
    const token = tokenService.mintVerificationToken(user);

    expect(tokenService.readVerificationToken(token)).toEqual({
      purpose: 'email_verification',
      sub: 7,
      email: 'rider@example.com',
    });
  });

  it('refuses a token older than a day', () => {
    jest.useFakeTimers({ now: new Date('2026-09-15T10:00:00Z') });
    const token = tokenService.mintVerificationToken(user);

    jest.setSystemTime(new Date('2026-09-16T10:00:01Z'));

    expect(() => tokenService.readVerificationToken(token)).toThrow(BadRequestException);
  });

  it('still reads a token minted 23 hours ago', () => {
    jest.useFakeTimers({ now: new Date('2026-09-15T10:00:00Z') });
    const token = tokenService.mintVerificationToken(user);

    jest.setSystemTime(new Date('2026-09-16T09:00:00Z'));

    expect(tokenService.readVerificationToken(token).sub).toBe(7);
  });

  // An access token is signed with the same secret and names the same user; only the
  // purpose tells them apart, so a token without one is not a verification token.
  it('refuses an access token - no purpose', () => {
    const accessToken = jwtService.sign({ sub: 7, email: 'rider@example.com' });

    expect(() => tokenService.readVerificationToken(accessToken)).toThrow(BadRequestException);
  });

  it('refuses a token minted for another purpose', () => {
    const otherToken = jwtService.sign({ purpose: 'password_reset', sub: 7, email: 'rider@example.com' });

    expect(() => tokenService.readVerificationToken(otherToken)).toThrow(BadRequestException);
  });

  it('refuses a token signed with another secret', () => {
    const forged = new JwtService({ secret: 'other-secret' }).sign({
      purpose: 'email_verification',
      sub: 7,
      email: 'rider@example.com',
    });

    expect(() => tokenService.readVerificationToken(forged)).toThrow(BadRequestException);
  });

  it('refuses garbage', () => {
    expect(() => tokenService.readVerificationToken('not-a-token')).toThrow(BadRequestException);
  });
});
