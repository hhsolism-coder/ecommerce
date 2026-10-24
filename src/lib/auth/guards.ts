import { redirect } from 'next/navigation'
import { getSessionUser, type SessionUser } from './session'

export type { SessionUser }

/** Predicado puro: útil para testear sin depender de `redirect`. */
export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === 'ADMIN'
}

/**
 * Usuario actual o `null`. No redirige.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  return getSessionUser()
}

/**
 * Exige una sesión iniciada. Redirige a /login si no la hay.
 */
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login')
  }
  return user
}

/**
 * Exige rol ADMIN. Redirige si no hay sesión o si el usuario no es admin.
 *
 * Debe invocarse dentro de cada Server Action de administración: la UI nunca
 * es la frontera de autorización.
 */
export async function requireAdmin(nextPath = '/admin'): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  }
  if (!isAdmin(user)) {
    redirect('/')
  }
  return user
}
