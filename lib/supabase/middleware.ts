import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkIsAdmin } from '@/lib/auth'

export async function updateSession(request: NextRequest, response?: NextResponse) {
  let supabaseResponse = response || NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = response ? response : NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: Do not run code between createServerClient and supabase.auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect the /admin route - redirect to login if not authenticated or not an admin
  const isAdminPath = request.nextUrl.pathname === '/admin' || 
                      request.nextUrl.pathname.startsWith('/admin/') ||
                      /\/(en|ko)\/admin(\/.*)?$/.test(request.nextUrl.pathname);

  if (isAdminPath) {
    if (!user) {
      const url = request.nextUrl.clone()
      const localeMatch = request.nextUrl.pathname.match(/^\/(en|ko)/)
      const locale = localeMatch ? localeMatch[1] : 'en'
      url.pathname = `/${locale}/auth/login`
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    if (!checkIsAdmin(user)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
