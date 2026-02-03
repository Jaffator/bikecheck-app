/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Controller,
  Request,
  Post,
  UseGuards,
  Get,
  Res,
  Req,
} from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import chalk from 'chalk';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}
  // email and password register endpoint
  @Public()
  @ApiOperation({ summary: 'register user with email and pass' })
  @Post('register')
  async createUser(@Request() req) {
    const newUser = await this.userService.createUserLocal(req.body);
    if (newUser) {
      console.log(chalk.greenBright(`User ${req.body.email} created`));
    }
    return this.authService.login(newUser);
  }

  // email password login endpoint
  @Public()
  @ApiOperation({ summary: 'login user' })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() req) {
    console.log(chalk.greenBright(`User ${req.user.email} logged in`));
    return this.authService.login(req.user);
  }

  // google auth endpoint
  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleAuth() {
    // initiates the Google OAuth2 login flow
  }

  // google auth callback endpoint
  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  googleAuthRedirect(@Req() req, @Res() res) {
    console.log(req.user);
    // 1. V req.user máš teď data z GoogleStrategy.validate()
    // 2. Tady buď uživatele najdeš v DB nebo ho vytvoříš (registrace)
    // 3. Vygeneruješ svůj standardní JWT token
    const { access_token } = this.authService.login(req.user);

    // Pro testování bez frontendu:
    // Místo přesměrování na frontend (res.redirect) prostě pošli token jako JSON
    return res.json({
      message: 'Přihlášení úspěšné!',
      backend_jwt_token: access_token,
      user_details: req.user,
    });
  }
}
