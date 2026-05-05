import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

/**
 * Proxy function for handling internationalization and authentication.
 * Renamed from `middleware` to `proxy` per Next.js 16 convention.
 *
 * CRITICAL RULES:
 * 1. Call intlMiddleware(request) FIRST
 * 2. No pathname splitting
 * 3. No manual locale prefixing (e.g., /${locale}/)
 * 4. Use request.nextUrl.clone() for redirects
 * 5. Set pathname without locale prefix for internal routing
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Skip static/internal paths immediately
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('/api/') ||
    pathname.includes('/static') ||
    pathname.includes('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // 2. Handle Authentication
  const token = request.cookies.get('logirest_token')?.value;
  const publicPaths = ['/login', '/forgot-password', '/reset-password'];

  // Check if it's a public path (ignoring locale prefix if present)
  const isPublicPage = publicPaths.some(path =>
    pathname.endsWith(path) || pathname === path
  );

  if (!token && !isPublicPage && pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (token && isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // 3. Apply intlMiddleware last for routing
  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for internal Next.js and static files
  matcher: [
    // Match all pathnames except for:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    '/((?!api|_next/static|_next/image|favicon.ico|static).*)',
  ],
};
