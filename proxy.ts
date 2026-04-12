import { updateSession } from '@/lib/supabase/middleware'
import createMiddleware from 'next-intl/middleware';
import { type NextRequest } from 'next/server'

const intlMiddleware = createMiddleware({
  locales: ['en', 'ko'],
  defaultLocale: 'en'
});

export async function proxy(request: NextRequest) {
  const response = intlMiddleware(request);
  return await updateSession(request, response as any);
}


export const config = {
  // Exclude /api/*, /_next/*, /_vercel/*, /studio/*, and static files from the i18n middleware
  matcher: ['/((?!api|_next|_vercel|studio|.*\\..*).*)']
}
