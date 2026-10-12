'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { ROLE_LABEL } from '@/lib/labels';
import type { SessionUser } from '@/lib/types';
import { PersonBadge } from './person-badge';
import { SessionContext } from './session';

const NAV = [
  { href: '/board', label: 'تابلو کارها', ownerOnly: false },
  { href: '/users', label: 'کاربران', ownerOnly: true },
];

/** Authenticated frame: navigation rail on the right (RTL start), top bar, and content. */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<SessionUser>('/auth/me')
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) router.replace('/login');
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function logout() {
    try {
      await api<void>('/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center" role="status" aria-live="polite">
        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="size-2 animate-pulse rounded-full bg-accent" aria-hidden="true" />
          در حال بارگذاری…
        </div>
      </div>
    );
  }

  const nav = NAV.filter((item) => !item.ownerOnly || user.role === 'owner');

  return (
    <SessionContext.Provider value={user}>
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-line bg-surface/90 backdrop-blur md:flex">
          <div className="flex items-center gap-3 border-b border-line px-5 py-5">
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-md bg-accent text-base font-extrabold text-white">
              ت
            </span>
            <div>
              <p className="font-extrabold leading-tight text-ink">تابلو وظایف</p>
              <p className="text-xs text-muted">هماهنگی کارهای تیم</p>
            </div>
          </div>

          <nav aria-label="ناوبری اصلی" className="flex-1 space-y-1 p-3">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                    active ? 'bg-accent-soft text-accent-ink' : 'text-ink hover:bg-paper'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-line p-4">
            <p className="truncate text-sm font-semibold text-ink">{user.displayName}</p>
            <p className="mt-0.5 text-xs text-muted">{ROLE_LABEL[user.role]}</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-line bg-paper/90 px-4 backdrop-blur md:px-8">
            <nav aria-label="ناوبری کوچک" className="flex gap-1 md:hidden">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="rounded px-2.5 py-1.5 text-sm font-semibold text-ink hover:bg-surface">
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="ms-auto flex items-center gap-3 text-sm">
              <span className="hidden text-muted sm:inline">{ROLE_LABEL[user.role]}</span>
              <PersonBadge name={user.displayName} />
              <button
                type="button"
                onClick={logout}
                className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                خروج
              </button>
            </div>
          </header>

          <main id="main" className="flex-1 px-4 py-8 md:px-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </SessionContext.Provider>
  );
}
