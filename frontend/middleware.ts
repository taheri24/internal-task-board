import { NextRequest, NextResponse } from 'next/server';

/**
 * Route guard for UX only. Cookies are only checked for presence here.
 * Real authorization happens in NestJS on every API call.
 */
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has('access_token') || req.cookies.has('refresh_token');
  const onLogin = req.nextUrl.pathname === '/login';
  if(!onLogin) NextResponse.next();
  if (!hasSession  ) return NextResponse.redirect(new URL('/login', req.url));
 // if (hasSession && onLogin) return NextResponse.redirect(new URL('/board', req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'],
};
