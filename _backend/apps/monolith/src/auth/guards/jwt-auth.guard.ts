import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core/services/reflector.service';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 1. Koukne se, jestli je u metody nebo u controlleru @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. Pokud najde @Public(), povolí přístup bez kontroly JWT
    if (isPublic) {
      return true;
    }

    // 3. Pokud tam @Public() není, spustí se standardní JWT logika
    return super.canActivate(context);
  }
}
