import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/cookie'

/**
 * Redirección optimista: si no hay cookie de sesión, manda al login.
 *
 * IMPORTANTE: este Proxy NO consulta la base de datos. La autorización real la
 * aplican `requireUser()` / `requireAdmin()` en los Server Components y las Server
 * Actions, que sí corren en el runtime de Node con acceso a Prisma.
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // La pantalla de éxito debe ser accesible también para invitados que pagaron
  // sin tener cuenta: Stripe redirige ahí al terminar el checkout.
  if (pathname === '/checkout/success') {
    return NextResponse.next()
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value)

  if (!hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/account/:path*', '/checkout/:path*'],
}
