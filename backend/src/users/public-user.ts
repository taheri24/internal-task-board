import { Role } from '../common/enums';
import type { User } from './user.entity';

/** The only user shape that leaves the server. Never includes passwordHash. */
export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  isActive: boolean;
}

export const toPublicUser = (u: User): PublicUser => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  role: u.role,
  isActive: u.isActive,
});
