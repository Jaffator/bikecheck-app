import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { users } from 'generated/prisma/client';

type SafeUser = Omit<users, 'password_hash'>;

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUserLocal(email: string, password: string): Promise<SafeUser | null> {
    const user = await this.userService.getUserbyEmail(email);

    // password and email check
    if (user && user.password_hash) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (isMatch) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password_hash, ...result } = user;
        return result;
      }
    }

    // check if email and googleID exist
    if (!user.password_hash && user.googleId && user.email === email) {
      throw new UnauthorizedException('This account was created by google account, use Google sign in instead');
    }
    throw new UnauthorizedException('User does not exist');
  }

  async validateUserGoogle() {}

  login(user: users) {
    const payload = { email: user.email, sub: user.id };
    return {
      jwt_token: this.jwtService.sign(payload),
      userID: user.id,
      email: user.email,
    };
  }
}
