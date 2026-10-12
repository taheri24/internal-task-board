import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IS_PUBLIC_KEY } from '../common/decorators';
import { toPublicUser } from '../users/public-user';
import { User } from '../users/user.entity';

/**
 * Runs on every request. The database is consulted each time, so a disabled user
 * loses access immediately, even while an access token is still within its 15-minute lifetime.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const token: string | undefined = req.cookies?.access_token;
    if (!token) throw new UnauthorizedException('Authentication required');

    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string }>(token);
    } catch {
      throw new UnauthorizedException('Session expired');
    }

    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException('Session expired');

    req.user = toPublicUser(user);
    return true;
  }
}
