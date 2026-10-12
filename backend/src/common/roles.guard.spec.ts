import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from './enums';
import { RolesGuard } from './roles.guard';

/** Required test 2: a Member cannot modify users (Owner-only routes). */
describe('RolesGuard', () => {
  it('denies a Member access to an Owner-only route such as PATCH /users/:id', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.Owner]);
    const guard = new RolesGuard(reflector);

    const ctx = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user: { id: 'm1', role: Role.Member } }) }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(false);
  });
});
