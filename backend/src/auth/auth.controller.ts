import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser, Public } from '../common/decorators';
import { toPublicUser, type PublicUser } from '../users/public-user';
import { AuthService } from './auth.service';
import { clearAuthCookies, setAuthCookies } from './cookies';
import { LoginDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: Number(process.env.LOGIN_RATE_LIMIT ?? 5), ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, accessToken, refreshToken } = await this.auth.login(dto.email, dto.password);
    setAuthCookies(res, accessToken, refreshToken);
    return { user: toPublicUser(user) };
  }

  @Public()
  @Throttle({ default: { limit: Number(process.env.REFRESH_RATE_LIMIT ?? 20), ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { user, accessToken, refreshToken } = await this.auth.refresh(req.cookies?.refresh_token);
    setAuthCookies(res, accessToken, refreshToken);
    return { user: toPublicUser(user) };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.refresh_token);
    clearAuthCookies(res);
  }

  @Get('me')
  me(@CurrentUser() user: PublicUser) {
    return user;
  }
}
