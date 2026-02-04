import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginGoogleDto } from './dto/auth.dtos';
import { SafeUserType, toSafeUser } from './interface/auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUserLocal(email: string, password: string): Promise<SafeUserType | null> {
    const user = await this.userService.getUserbyEmail(email);

    // password and email check
    if (user && user.password_hash) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (isMatch) {
        return toSafeUser(user);
      }
    }

    // check if email and googleID exist
    if (!user.password_hash && user.googleId && user.email === email) {
      throw new UnauthorizedException('This account was created by google account, use Google sign in instead');
    }
    throw new UnauthorizedException('User does not exist');
  }

  async registerOrLoginUserGoogle(dto: LoginGoogleDto): Promise<SafeUserType> {
    const user = await this.userService.getUserbyEmail(dto.email);
    // 1. if user with this email exist, check googleID
    if (user.googleId === dto.googleId) {
      return toSafeUser(user);
    } else {
      // 2. if not, create new user
      return this.userService.createUserByGoogle(dto);
    }
  }

  getJWTtoken(user: SafeUserType) {
    const payload = { email: user.email, sub: user.id };
    return this.jwtService.sign(payload);
  }
}
