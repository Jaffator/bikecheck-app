import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginGoogleDto } from './dto/auth.dtos';
import type { Response } from 'express';
import { users as UserFull } from 'generated/prisma/client';

type GoogleUserType = {
  user: UserFull;
  isNewUser: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUserLocal(email: string, password: string): Promise<UserFull | null> {
    const user = await this.userService.getUserbyEmail(email);
    if (!user) {
      return null;
    }
    // password and email check
    if (user && user.password_hash) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (isMatch) {
        return user;
      }
    }
    // check if email and googleID exist
    if (!user.password_hash && user.googleId && user.email === email) {
      throw new UnauthorizedException('This account was created by google account, use Google sign in instead');
    }
    return null;
  }

  async registerOrLoginUserGoogle(dto: LoginGoogleDto): Promise<GoogleUserType> {
    // 1. Google user exist
    const userGoogle = await this.userService.getUserbyGoogleId(dto.googleId);
    if (userGoogle?.googleId === dto.googleId) {
      return { user: userGoogle, isNewUser: false };
    }

    // 2. Google user does NOT exist but email YES -> link googleiId to user account
    const userEmail = await this.userService.getUserbyEmail(dto.email);
    if (userEmail && userEmail?.googleId != dto.googleId && userEmail?.email === dto.email && dto.emailVerified) {
      const updatedUser = await this.userService.updateUserProfile(userEmail.id, {
        googleId: dto.googleId,
        avatar_url: dto.avatar_url,
      });
      return { user: updatedUser, isNewUser: false };
    }
    // 3 User does NOT exist at all -> create new register
    const newUser = await this.userService.createUserByGoogle(dto);
    return { user: newUser, isNewUser: true };
  }

  setJWTtokenToCookie(res: Response, user: UserFull) {
    const payload = { email: user.email, sub: user.id };
    const jwt_token = this.jwtService.sign(payload);
    res.cookie('access_token', jwt_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  }
}
