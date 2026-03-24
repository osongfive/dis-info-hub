import { updateSession } from '@/lib/supabase/middleware'
import createMiddleware from 'next-intl/middleware';
import { type NextRequest } from 'next/server'

const intlMiddleware = createMiddleware({
  locales: ['en', 'ko'],
  defaultLocale: 'en'
});

export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  return await updateSession(request, response as any);
}

export const config = {
  matcher: ['/', '/(ko|en)/:path*', '/((?!_next|_vercel|.*\\..*).*)']
}
