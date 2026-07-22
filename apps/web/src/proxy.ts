import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

/** 
 * Route prefix → allowed roles mapping.
 * Checked by base64-decoded JWT payload in the proxy.
 * This is a UX guard only. The API enforces the real boundary.
 */
const ROUTE_ROLE_MAP: Record<string, string[]> = {
  '/stocktake': ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR', 'APPROVER', 'AUDITOR', 'GM'],
  '/adjustments': ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR', 'APPROVER', 'AUDITOR', 'GM'],
  '/transfers': ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR', 'APPROVER', 'AUDITOR', 'GM'],
  '/issues': ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR', 'KITCHEN_CHIEF', 'AUDITOR', 'GM'],
  '/goods-received': ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR', 'PROC_OFFICER', 'PROC_MGR', 'APPROVER', 'AUDITOR', 'GM'],
  '/inventory': ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR', 'KITCHEN_CHIEF', 'AUDITOR', 'GM', 'VIEWER'],
  '/purchase-requests': ['ADMIN', 'INV_MGR', 'PROC_OFFICER', 'PROC_MGR', 'BRANCH_MGR', 'STORE_MGR', 'APPROVER', 'AUDITOR', 'GM', 'VIEWER'],
  '/purchase-orders': ['ADMIN', 'PROC_MGR', 'PROC_OFFICER', 'BRANCH_MGR', 'INV_MGR', 'APPROVER', 'AUDITOR', 'GM', 'VIEWER'],
  '/kitchen-requests': ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR', 'KITCHEN_CHIEF'],
  '/admin': ['ADMIN'],
  '/reports': ['ADMIN', 'INV_MGR', 'STORE_MGR', 'BRANCH_MGR', 'PROC_MGR', 'GM', 'AUDITOR', 'VIEWER', 'APPROVER'],
};

/** 
 * Reads role from JWT payload via base64 decode (no signature verification).
 * Returns null if token is malformed.
 */
function getRoleFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    ) as Record<string, unknown>;
    return typeof payload['role'] === 'string' ? payload['role'] : null;
  } catch {
    return null;
  }
}


/**
 * Proxy function for handling internationalization and authentication.
 * Per Next.js 16 convention, this file acts as the primary gateway.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static/internal paths immediately
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/opengraph-image') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/logoicon') ||
    pathname.includes('/api/') ||
    pathname.includes('/static') ||
    pathname.includes('/favicon') ||
    pathname.includes('/icon') ||
    pathname.includes('/logoicon') ||
    pathname.includes('/opengraph-image') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Detect Locale
  const supportedLocales = routing.locales as readonly string[];
  const segments = pathname.split('/');
  const firstSegment = segments[1] || '';
  const hasLocalePrefix = supportedLocales.includes(firstSegment);

  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const preferredLocale = (cookieLocale && supportedLocales.includes(cookieLocale))
    ? cookieLocale
    : (routing.defaultLocale as string);

  const locale = hasLocalePrefix ? firstSegment : preferredLocale;

  // 3. Helpers & Normalization
  const publicPaths = ['/login', '/forgot-password', '/reset-password', '/preview-loading'];
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
  const reason = request.nextUrl.searchParams.get('reason');
  const isAuthReason = reason === 'expired' || reason === 'verification_failed';

  // Detect Social Web Crawlers (WhatsApp, Facebook, Twitter, Telegram, LinkedIn, etc.)
  // Crawlers must NOT be subjected to 307 query parameter redirects so they can read OpenGraph tags directly.
  const userAgent = request.headers.get('user-agent') || '';
  const isSocialCrawler = /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|TelegramBot|Discordbot|Slackbot|Googlebot|bingbot/i.test(userAgent);

  // Debug log (Internal only)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Proxy] Path: ${pathname} | Normalized: ${normalizedPath} | Locale: ${locale} | Auth: ${!!token} | Crawler: ${isSocialCrawler}`);
  }

  // A. Internal Tooling Guard (Production)
  if (isInternalPath && process.env.NODE_ENV === 'production') {
    console.log(`[Proxy] Blocking internal path in production: ${pathname}`);
    return NextResponse.rewrite(new URL(`/${locale}/404`, request.url));
  }

  // B. Unauthenticated -> Login (Locale-Safe) — Skipped for Social Crawlers
  if (!token && !isPublicPage && !isSocialCrawler) {
    // Sanitize any potential double slashes in pathname first
    let cleanPath = pathname;
    while (cleanPath.startsWith('//')) {
      cleanPath = cleanPath.substring(1);
    }
    if (!cleanPath.startsWith('/')) {
      cleanPath = '/' + cleanPath;
    }

    // Determine the redirect path with locale prefix
    let callbackPath = cleanPath;
    const parts = cleanPath.split('/');
    const firstSegment = parts[1] || '';
    if (!supportedLocales.includes(firstSegment)) {
      callbackPath = `/${locale}${cleanPath}`;
    }

    // Double check double slashes
    while (callbackPath.startsWith('//')) {
      callbackPath = callbackPath.substring(1);
    }

    const callbackUrl = callbackPath + request.nextUrl.search;
    console.log(`[Proxy] Unauthenticated access to protected route: ${pathname} -> Redirecting to /login with callbackUrl=${callbackUrl}`);

    const loginUrl = constructUrl('/login');
    loginUrl.searchParams.set('callbackUrl', callbackUrl);
    loginUrl.searchParams.set('redirect', callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  // D. Role-based route protection (UX layer)
  if (token) {
    const userRole = getRoleFromToken(token);
    for (const [routePrefix, allowedRoles] of Object.entries(ROUTE_ROLE_MAP)) {
      if (normalizedPath.startsWith(routePrefix)) {
        if (!userRole || !allowedRoles.includes(userRole)) {
          console.log(`[Proxy] Role '${userRole}' not authorized for route: ${normalizedPath} → 403`);
          return NextResponse.rewrite(constructUrl('/403'));
        }
        break; // first match wins
      }
    }
  }

  // C. Authenticated on Public Page -> Dashboard
  //
  // IMPORTANT: Check isAuthReason FIRST.
  // When a token is present but the reason is "expired" or "verification_failed",
  // we MUST issue a REDIRECT (not NextResponse.next()) to clear the stale cookie.
  //
  // Why redirect instead of next():
  //   NextResponse.next() causes Next.js to re-invoke this middleware internally
  //   with the original incoming request, which still carries the stale token in
  //   its cookies (cookie deletion only affects the outgoing *response*, not the
  //   *request* object). On that second internal pass, `isAuthReason` would be
  //   false (re-pass URL may drop the ?reason param), so block D below would fire
  //   and incorrectly send the user to /dashboard.
  //
  //   A redirect forces the *browser* to make a brand-new request — this time
  //   without the token cookie (because we set maxAge: 0 on the redirect
  //   response). The next hit arrives with no token, skips all auth blocks, and
  //   the login page renders correctly.
  if (token && isAuthReason && (isPublicPage || isRoot)) {
    console.log(`[Proxy] Authenticated user on public page with expired token reason: ${pathname} -> Redirecting to clear stale cookie`);
    const redirectUrl = request.nextUrl.clone();
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete('logirest_token');
    response.cookies.set('logirest_token', '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax' });
    return response;
  }

  if (token && (isPublicPage || isRoot) && normalizedPath !== '/reset-password') {
    console.log(`[Proxy] Authenticated user on public/root page: ${pathname} -> Redirecting to /dashboard`);
    return NextResponse.redirect(constructUrl('/dashboard'));
  }

  // 4. Final Locale Handling via next-intl
  console.log(`[Proxy] Proceeding with locale middleware for: ${pathname}`);
  return intlMiddleware(request);
}


export const config = {
  matcher: [
    // Match all paths except internal Next.js and static files/OpenGraph assets
    '/((?!api|_next/static|_next/image|opengraph-image|favicon|icon|logoicon|.*\\..*).*)',
  ],
};

export default proxy;

