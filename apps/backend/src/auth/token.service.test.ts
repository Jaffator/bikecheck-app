/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from './token.service';
import { RefreshTokenRepository } from '../refreshtoken/refreshtoken.repository';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { UnauthorizedException } from '@nestjs/common';
import { users as UserFull } from '@prisma/client';

describe('TokenService_testing', () => {
  let tokenService: TokenService;
  let repo: RefreshTokenRepository;

  const mockRepo = {
    findByToken: jest.fn(),
    revokeToken: jest.fn(),
    revokeAndCreateNew: jest.fn(),
    create: jest.fn(),
  };

  const mockUserService = {
    getUserbyId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: RefreshTokenRepository, useValue: mockRepo },
        { provide: JwtService, useValue: { sign: () => 'fake-access-token' } },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    tokenService = module.get<TokenService>(TokenService);
    repo = module.get<RefreshTokenRepository>(RefreshTokenRepository);
  });
  describe('RefreshToken', () => {
    it('Should return new access token and reuse refresh token', async () => {
      // ARRANGE
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5); // + 5days

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
