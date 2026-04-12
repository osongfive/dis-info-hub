import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
  // Match /admin or localized paths like /en/admin, /ko/admin
  const isAdminPath = request.nextUrl.pathname === '/admin' || 
                      request.nextUrl.pathname.startsWith('/admin/') ||
                      request.nextUrl.pathname.match(/\/(en|ko)\/admin(\/.*)?$/);

  if (isAdminPath) {

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    // Role Check: Ensure user has 'admin' privilege
    const userRole = (user.app_metadata?.role as string) || (user.user_metadata?.role as string);
    if (userRole !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/' // Redirect unauthorized non-admins to home
      return NextResponse.redirect(url)
    }
  }


  return supabaseResponse
}
