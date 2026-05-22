import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { getLoggerToken } from 'nestjs-pino';
import { RefreshTokenRepository } from '../refreshtoken/refreshtoken.repository';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
// import { UnauthorizedException } from '@nestjs/common';
// import { users as UserFull } from '@prisma/client';

describe('AuthService_testing', () => {
  let authService: AuthService;
  const mockUserService = {
    getUserbyEmail: jest.fn(),
  };
  const mockRefreshTokenRepository = {
    revokeToken: jest.fn(() => {}),
    findByToken: jest.fn(() => {}),
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
        { provide: RefreshTokenRepository, useValue: mockRefreshTokenRepository },
        { provide: getLoggerToken(AuthService.name), useValue: mockLogger },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('loginUserLocal', () => {
    // happy path
    it('Should return user if email and password correct', async () => {
      // ARRANGE
      const email = 'test@test.com';
      const password = 'password';
      const password_hash = await bcrypt.hash(password, 5);
      const user = { id: 1, email, password_hash };
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
      const user = { id: 1, email, password_hash, googleId };
      mockUserService.getUserbyEmail.mockResolvedValue(user);

      // ASSERT ACT
      await expect(authService.loginUserLocal(email, password)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should call revoke fnc', async () => {
      // ARRANGE
      const refresh_token = 'abc';

      // ACT
      await authService.logout(refresh_token);

      // ASSSERT
      expect(mockRefreshTokenRepository.revokeToken).toHaveBeenCalled();
    });
  });
});
