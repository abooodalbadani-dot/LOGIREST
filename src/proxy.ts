import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

/**
 * Proxy function for handling internationalization and authentication.
 * Renamed from `middleware` to `proxy` per Next.js 16 convention.
 *
 * ROOT FIX: All redirects must include locale prefix because localePrefix: 'always'
 * means routes like /login do not exist — only /ar/login and /en/login exist.
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

  // 2. Extract the current locale from the URL path (validated against supported locales)
  const supportedLocales = routing.locales as readonly string[];
  const firstSegment = pathname.split('/')[1] || '';
  const locale = supportedLocales.includes(firstSegment)
    ? firstSegment
    : (routing.defaultLocale as string);

  // 3. Handle Authentication
  const token = request.cookies.get('logirest_token')?.value;
  const publicPaths = ['/login', '/forgot-password', '/reset-password'];

  // Check if it's a public path (compare path without locale prefix)
  const isPublicPage = publicPaths.some(
    path => pathname === `/${locale}${path}` || pathname === path
  );

  // Allow locale root paths like /ar or /en (page.tsx handles redirect there)
  const isLocaleRoot = pathname === `/${locale}` || pathname === `/${locale}/` || pathname === '/';

  // If no token and not on a public or root page → redirect to /[locale]/login
  if (!token && !isPublicPage && !isLocaleRoot) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  // If has token and trying to access public page → redirect to /[locale]/dashboard
  if (token && isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  // 4. Apply intlMiddleware last for locale routing
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|static).*)',
  ],
};
