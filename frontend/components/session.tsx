'use client';

import { createContext, useContext } from 'react';
import type { SessionUser } from '@/lib/types';

export const SessionContext = createContext<SessionUser | null>(null);

export function useSession(): SessionUser {
  const user = useContext(SessionContext);
  if (!user) throw new Error('useSession must be used inside the authenticated shell');
  return user;
}
