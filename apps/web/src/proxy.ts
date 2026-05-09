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

  // 3. Authentication Check
  const token = request.cookies.get('logirest_token')?.value;
  const publicPaths = ['/login', '/forgot-password', '/reset-password'];

  // Normalize pathname for check (remove locale if present)
  const purePathname = hasLocalePrefix
    ? '/' + segments.slice(2).join('/')
    : pathname;

  // Ensure purePathname is clean
  const normalizedPath = purePathname === '/' ? '/' : (purePathname.startsWith('/') ? purePathname : '/' + purePathname);
  const isPublicPage = publicPaths.includes(normalizedPath);
  const isRoot = normalizedPath === '/';

  // Debug log (will show in server console)
  console.log(`[Proxy] Path: ${pathname} | Pure: ${normalizedPath} | Locale: ${locale} | Auth: ${!!token} | Public: ${isPublicPage}`);

  // Case A: Unauthenticated user accessing private page (including root)
  if (!token && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  // Case B: Authenticated user accessing public page (like login)
  if (token && isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  // Case C: Authenticated user accessing root -> redirect to dashboard
  if (token && isRoot) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  // Case D: Missing locale prefix
  if (!hasLocalePrefix) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${normalizedPath === '/' ? '' : normalizedPath}`;
    return NextResponse.redirect(url);
  }


  // 4. Final Locale Handling via next-intl
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all paths except internal Next.js and static files
    '/((?!api|_next/static|_next/image|favicon.ico|static|icon.svg|favicon.svg).*)',
  ],
};

export default proxy;

