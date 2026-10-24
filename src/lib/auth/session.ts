import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  verifySessionToken,
  type Role,
} from './jwt'

export type SessionUser = {
  id: string
  email: string
  name: string
  role: Role
}

export async function createSession(userId: string, role: Role): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)
  const session = await prisma.session.create({ data: { userId, expiresAt } })
  const token = await signSessionToken({ sub: userId, sid: session.id, role })

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value

  if (token) {
    const payload = await verifySessionToken(token)
    if (payload) {
      await prisma.session.updateMany({
        where: { id: payload.sid, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    }
  }

  store.delete(SESSION_COOKIE)
}

/**
 * Resuelve el usuario de una sesión contra la base de datos.
 *
 * Es la única fuente de verdad del ROL: aunque el token diga ADMIN, si la fila
 * `User` dice USER, el usuario effective es USER. Por eso degradar a un admin
 * surte efecto en la petición siguiente sin necesidad de cerrar sesión.
 */
export async function resolveSessionUser(sessionId: string, userId: string): Promise<SessionUser | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  })

  if (!session) return null
  if (session.revokedAt !== null) return null
  if (session.expiresAt.getTime() <= Date.now()) return null
  if (session.userId !== userId) return null

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  }
}

/**
 * Resuelve la sesión actual consultando la base de datos.
 *
 * El JWT solo demuestra la identidad: la fila `Session` confirma que la sesión no fue
 * revocada ni expiró, y el ROL se lee siempre desde `User`.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const payload = await verifySessionToken(token)
  if (!payload) return null

  return resolveSessionUser(payload.sid, payload.sub)
}

/**
 * Revoca todas las sesiones activas de un usuario.
 * Se usa al cambiar un rol o al cambiar la contraseña.
 */
export async function revokeUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  })
}
