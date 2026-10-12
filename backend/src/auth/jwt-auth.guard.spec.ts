import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Role } from '../common/enums';

/** Required test 3: a disabled user cannot use an old, still-valid token. */
describe('JwtAuthGuard', () => {
  it('rejects a valid token once the user has been disabled', async () => {
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: 'u1' }) } as any;
    const users = {
      findOne: jest.fn().mockResolvedValue({
        id: 'u1', email: 'a@b.c', displayName: 'x', role: Role.Member, isActive: false,
      }),
    } as any;
    const guard = new JwtAuthGuard(new Reflector(), jwt, users);

    const req: any = { cookies: { access_token: 'old-but-valid-token' } };
    const ctx = {
      getHandler: () => () => undefined,
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(req.user).toBeUndefined();
  });
});
