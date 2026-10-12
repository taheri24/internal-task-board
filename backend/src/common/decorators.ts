import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Role } from './enums';
import type { PublicUser } from '../users/public-user';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): PublicUser => {
  return ctx.switchToHttp().getRequest().user as PublicUser;
});
