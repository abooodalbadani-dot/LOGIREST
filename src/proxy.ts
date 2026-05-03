import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
 const pathname = request.nextUrl.pathname;

 // Public paths that don't require authentication
 const isPublicPage =
 pathname.includes('/login') ||
 pathname.includes('/forgot-password') ||
 pathname.includes('/reset-password');

 // Check for authentication token in cookies
 const token = request.cookies.get('logirest_token')?.value;

 // If the user is not authenticated and trying to access a protected page
 if (
 !token &&
 !isPublicPage &&
 pathname !== '/' &&
 !pathname.includes('/static') &&
 !pathname.includes('/favicon.ico')
 ) {
 const locale = pathname.split('/')[1] || 'ar';
 const loginUrl = new URL(`/${locale}/login`, request.url);
 return NextResponse.redirect(loginUrl);
 }

 // If the user is authenticated and trying to access the login page
 if (token && isPublicPage) {
 const locale = pathname.split('/')[1] || 'ar';
 const dashboardUrl = new URL(`/${locale}/dashboard`, request.url);
 return NextResponse.redirect(dashboardUrl);
 }

 return intlMiddleware(request);
}

export const config = {
 // Match all pathnames except for
 // - /api (API routes)
 // - /_next (Next.js internals)
 // - /static (static files)
 // - /_vercel (Vercel internals)
 // - favicon.ico, sitemap.xml, robots.txt (static files)
 matcher: ['/((?!api|_next|static|_vercel|favicon.ico|sitemap.xml|robots.txt).*)'],
};
