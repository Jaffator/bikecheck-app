import { Injectable } from '@nestjs/common';
import { LoginGoogleDto } from './dto/auth.dtos';
import { users as UserFull } from '@prisma/client';
import { UserService } from '../user/user.service';

type GoogleUserType = {
  user: UserFull;
  isNewUser: boolean;
};

@Injectable()
export class GoogleAuthService {
  constructor(private userService: UserService) {}

  async googleLogin(dto: LoginGoogleDto): Promise<GoogleUserType> {
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
}
