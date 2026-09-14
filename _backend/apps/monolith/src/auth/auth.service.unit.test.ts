import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { getLoggerToken } from 'nestjs-pino';
import { RefreshTokenService } from '../refreshtoken/refreshtoken.service';
import * as bcrypt from 'bcrypt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
// import { UnauthorizedException } from '@nestjs/common';
// import { users as UserFull } from '@prisma/client';

describe('AuthService_testing', () => {
  let authService: AuthService;
  const mockUserService = {
    getUserbyEmail: jest.fn(),
    getUserbyId: jest.fn(),
    updatePassword: jest.fn(),
  };
  const mockRefreshTokenService = {
    revokeToken: jest.fn(() => {}),
    findByToken: jest.fn(() => {}),
    revokeAllUserTokensExcept: jest.fn(() => {}),
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
