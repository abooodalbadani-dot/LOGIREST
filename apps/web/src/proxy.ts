import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

/**
 * Proxy function for handling internationalization and authentication.
 * Per Next.js 16 convention, this file acts as the primary gateway.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static/internal paths immediately
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('/api/') ||
    pathname.includes('/static') ||
    pathname.includes('/favicon.svg') ||
    pathname.includes('/icon.svg') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Detect Locale
  const supportedLocales = routing.locales as readonly string[];
  const segments = pathname.split('/');
  const firstSegment = segments[1] || '';
  const hasLocalePrefix = supportedLocales.includes(firstSegment);
  const locale = hasLocalePrefix ? firstSegment : (routing.defaultLocale as string);

  // 3. Helpers & Normalization
  const publicPaths = ['/login', '/forgot-password', '/reset-password'];
  const internalPaths = ['/debug', '/test-bed', '/style-guide'];

  // Extract pure path (no locale)
  const purePathname = hasLocalePrefix ? '/' + segments.slice(2).join('/') : pathname;
  const normalizedPath = purePathname === '/' ? '/' : (purePathname.startsWith('/') ? purePathname : '/' + purePathname);

  const isPublicPage = publicPaths.includes(normalizedPath);
  const isInternalPath = internalPaths.some(p => normalizedPath.startsWith(p));
  const isRoot = normalizedPath === '/';

  // Helper to construct locale-aware URLs safely
  const constructUrl = (targetPath: string) => {
    const url = request.nextUrl.clone();
    // Ensure targetPath doesn't already have the locale
    const cleanTarget = targetPath.startsWith(`/${locale}`)
      ? targetPath.replace(`/${locale}`, '')
      : targetPath;

    url.pathname = `/${locale}${cleanTarget.startsWith('/') ? '' : '/'}${cleanTarget}`;
    return url;
  };

  // 4. Security Enforcement (SSR Level)
  const token = request.cookies.get('logirest_token')?.value;

  // Debug log (Internal only)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Proxy] Path: ${pathname} | Normalized: ${normalizedPath} | Locale: ${locale} | Auth: ${!!token}`);
  }

  // A. Internal Tooling Guard (Production)
  if (isInternalPath && process.env.NODE_ENV === 'production') {
    console.log(`[Proxy] Blocking internal path in production: ${pathname}`);
    return NextResponse.rewrite(new URL(`/${locale}/404`, request.url));
  }

  // B. Unauthenticated -> Login (Locale-Safe)
  if (!token && !isPublicPage) {
    console.log(`[Proxy] Unauthenticated access to protected route: ${pathname} -> Redirecting to /login`);
    return NextResponse.redirect(constructUrl('/login'));
  }

  // C. Authenticated on Public Page -> Dashboard
  if (token && (isPublicPage || isRoot)) {
    console.log(`[Proxy] Authenticated user on public/root page: ${pathname} -> Redirecting to /dashboard`);
    return NextResponse.redirect(constructUrl('/dashboard'));
  }

  // 4. Final Locale Handling via next-intl
  console.log(`[Proxy] Proceeding with locale middleware for: ${pathname}`);
  return intlMiddleware(request);
}


export const config = {
  matcher: [
    // Match all paths except internal Next.js and static files
    '/((?!api|_next/static|_next/image|favicon.ico|static|icon.svg|favicon.svg).*)',
  ],
};

export default proxy;

